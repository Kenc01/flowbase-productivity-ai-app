import { useRef, useCallback, useEffect } from "react";
import { api } from "@/lib/api";

export type VoiceAgentStatus =
  | "idle"
  | "connecting"
  | "listening"
  | "thinking"
  | "speaking"
  | "stopping"
  | "error";

export interface VoiceAgentMessage {
  id: string;
  role: "user" | "agent";
  text: string;
  timestamp: Date;
}

export interface UseVoiceAgentOptions {
  masterName: string;
  voice?: string;
  onMessage: (msg: VoiceAgentMessage) => void;
  onStatusChange: (s: VoiceAgentStatus) => void;
  onError: (msg: string) => void;
}

// AssemblyAI real-time STT expects 16kHz PCM16 mono
const SAMPLE_RATE = 16_000;

const WORKLET_CODE = `
class JarvisPcmCapture extends AudioWorkletProcessor {
  process(inputs) {
    const ch = inputs[0]?.[0];
    if (ch && ch.length > 0) {
      const i16 = new Int16Array(ch.length);
      for (let i = 0; i < ch.length; i++) {
        i16[i] = Math.max(-32768, Math.min(32767, Math.round(ch[i] * 32767)));
      }
      this.port.postMessage(i16.buffer, [i16.buffer]);
    }
    return true;
  }
}
registerProcessor("jarvis-pcm-capture", JarvisPcmCapture);
`;

function uid() {
  return Math.random().toString(36).slice(2, 12) + Date.now().toString(36);
}

function timeOfDay() {
  const h = new Date().getHours();
  if (h < 12) return "morning";
  if (h < 17) return "afternoon";
  return "evening";
}

function pickVoice(): SpeechSynthesisVoice | null {
  const voices = window.speechSynthesis.getVoices();
  if (!voices.length) return null;
  const preferences = [
    "Google UK English Male",
    "Microsoft George",
    "Daniel",
    "Google US English",
    "Google UK English Female",
  ];
  for (const pref of preferences) {
    const v = voices.find((v) => v.name.includes(pref));
    if (v) return v;
  }
  return voices.find((v) => v.lang.startsWith("en")) ?? null;
}

export function useVoiceAgent(opts: UseVoiceAgentOptions) {
  const optsRef = useRef(opts);
  useEffect(() => { optsRef.current = opts; });

  const wsRef = useRef<WebSocket | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const workletRef = useRef<AudioWorkletNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const blobUrlRef = useRef<string>("");
  const activeRef = useRef(false);
  const isSpeakingRef = useRef(false);
  const historyRef = useRef<Array<{ role: string; content: string }>>([]);

  // ── TTS via Web Speech API ─────────────────────────────────────────────────

  const stopSpeaking = useCallback(() => {
    if (isSpeakingRef.current) {
      window.speechSynthesis.cancel();
      isSpeakingRef.current = false;
    }
  }, []);

  const speak = useCallback(
    (text: string) => {
      stopSpeaking();
      if (!("speechSynthesis" in window) || !text.trim()) return;

      const utterance = new SpeechSynthesisUtterance(text);

      // Try to pick a good voice; retry once after voiceschanged fires
      const trySetVoice = () => {
        const v = pickVoice();
        if (v) utterance.voice = v;
      };
      trySetVoice();
      if (!utterance.voice) {
        window.speechSynthesis.addEventListener("voiceschanged", trySetVoice, { once: true });
      }

      utterance.rate = 0.92;
      utterance.pitch = 0.88;
      utterance.volume = 1.0;

      isSpeakingRef.current = true;
      optsRef.current.onStatusChange("speaking");

      utterance.onend = () => {
        isSpeakingRef.current = false;
        if (activeRef.current) optsRef.current.onStatusChange("listening");
      };
      utterance.onerror = () => {
        isSpeakingRef.current = false;
        if (activeRef.current) optsRef.current.onStatusChange("listening");
      };

      window.speechSynthesis.speak(utterance);
    },
    [stopSpeaking]
  );

  // ── Groq chat via backend ──────────────────────────────────────────────────

  const sendToGroq = useCallback(
    async (userText: string) => {
      const { onMessage, onStatusChange } = optsRef.current;

      stopSpeaking();
      onStatusChange("thinking");

      // Emit user transcript to UI
      onMessage({ id: uid(), role: "user", text: userText, timestamp: new Date() });
      historyRef.current.push({ role: "user", content: userText });

      try {
        const data = await api.post<{ message: string; actions: any[] }>(
          "/ai-assistant/chat",
          {
            userMessage: userText,
            history: historyRef.current.slice(-12),
          }
        );

        const responseText =
          data.message?.trim() ||
          "I encountered an issue. Please try again.";

        historyRef.current.push({ role: "assistant", content: responseText });
        onMessage({
          id: uid(),
          role: "agent",
          text: responseText,
          timestamp: new Date(),
        });

        if (activeRef.current) speak(responseText);
      } catch {
        const errMsg = "I'm having trouble connecting. Please try again.";
        onMessage({ id: uid(), role: "agent", text: errMsg, timestamp: new Date() });
        if (activeRef.current) speak(errMsg);
      }
    },
    [speak, stopSpeaking]
  );

  // ── Microphone → AssemblyAI STT ────────────────────────────────────────────

  const startMic = useCallback(
    async (ws: WebSocket, ctx: AudioContext) => {
      const { onError, onStatusChange } = optsRef.current;
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            sampleRate: SAMPLE_RATE,
            channelCount: 1,
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          },
        });
        streamRef.current = stream;

        const source = ctx.createMediaStreamSource(stream);
        const worklet = new AudioWorkletNode(ctx, "jarvis-pcm-capture");
        workletRef.current = worklet;

        // Drain output silently (prevent feedback loop)
        const silent = ctx.createGain();
        silent.gain.value = 0;
        worklet.connect(silent);
        silent.connect(ctx.destination);
        source.connect(worklet);

        // Send PCM16 binary frames to AssemblyAI (not base64, raw binary)
        worklet.port.onmessage = (e: MessageEvent) => {
          if (
            ws.readyState === WebSocket.OPEN &&
            !isSpeakingRef.current &&
            activeRef.current
          ) {
            ws.send(e.data as ArrayBuffer);
          }
        };

        onStatusChange("listening");
      } catch {
        onError(
          "Microphone access denied. Please allow microphone use in your browser."
        );
        onStatusChange("idle");
        activeRef.current = false;
      }
    },
    []
  );

  // ── Connect / Disconnect ───────────────────────────────────────────────────

  const connect = useCallback(async () => {
    const { masterName, onMessage, onStatusChange, onError } = optsRef.current;

    activeRef.current = true;
    historyRef.current = [];
    onStatusChange("connecting");

    try {
      // 1. Get AssemblyAI short-lived streaming token from our backend
      const { token } = await api.post<{ token: string }>(
        "/assemblyai/token",
        {}
      );
      if (!token) throw new Error("No streaming token received from server");

      // 2. Set up AudioContext + worklet
      const ctx = new (window.AudioContext as any)({ sampleRate: SAMPLE_RATE });
      audioCtxRef.current = ctx;

      const blobUrl = URL.createObjectURL(
        new Blob([WORKLET_CODE], { type: "application/javascript" })
      );
      blobUrlRef.current = blobUrl;
      await ctx.audioWorklet.addModule(blobUrl);
      URL.revokeObjectURL(blobUrl);
      blobUrlRef.current = "";

      // 3. Connect to AssemblyAI real-time STT WebSocket
      const ws = new WebSocket(
        `wss://streaming.assemblyai.com/v3/ws?token=${encodeURIComponent(token)}&sample_rate=${SAMPLE_RATE}&encoding=pcm_s16le`
      );
      wsRef.current = ws;

      ws.onopen = () => {
        startMic(ws, ctx);
      };

      ws.onmessage = async (evt) => {
        let msg: any;
        try {
          msg = JSON.parse(evt.data as string);
        } catch {
          return;
        }

        const type: string = msg.message_type ?? msg.type ?? "";

        if (type === "SessionBegins" || type === "session.started") {
          // Greet the user
          const name = masterName.trim() || "sir";
          const greetText = `Grind OS online. Good ${timeOfDay()}, Master ${name}. Ready when you are.`;
          onMessage({
            id: uid(),
            role: "agent",
            text: greetText,
            timestamp: new Date(),
          });
          historyRef.current.push({ role: "assistant", content: greetText });
          speak(greetText);
        } else if (
          type === "PartialTranscript" ||
          type === "partial_transcript"
        ) {
          // Barge-in: if user starts speaking while JARVIS is talking, stop
          if (isSpeakingRef.current && (msg.text ?? "").trim().length > 3) {
            stopSpeaking();
          }
        } else if (
          type === "FinalTranscript" ||
          type === "final_transcript"
        ) {
          const text: string = (msg.text ?? "").trim();
          if (text) {
            await sendToGroq(text);
          }
        } else if (msg.error) {
          console.error("AssemblyAI STT error:", msg.error);
        }
      };

      ws.onerror = () => {
        if (activeRef.current) {
          onError(
            "Voice connection error. Check your internet and try again."
          );
          onStatusChange("idle");
          activeRef.current = false;
        }
      };

      ws.onclose = (e) => {
        if (activeRef.current && e.code !== 1000 && e.code !== 1001) {
          console.warn("STT WebSocket closed unexpectedly:", e.code, e.reason);
        }
        if (activeRef.current) onStatusChange("idle");
      };
    } catch (err: any) {
      console.error("Voice agent connect error:", err);
      optsRef.current.onError(
        err?.message ?? "Failed to start voice session"
      );
      optsRef.current.onStatusChange("idle");
      activeRef.current = false;
    }
  }, [speak, stopSpeaking, sendToGroq, startMic]);

  const disconnect = useCallback(() => {
    activeRef.current = false;
    optsRef.current.onStatusChange("stopping");

    stopSpeaking();

    workletRef.current?.disconnect();
    workletRef.current = null;

    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;

    if (wsRef.current) {
      try {
        wsRef.current.send(JSON.stringify({ terminate_session: true }));
      } catch {}
      wsRef.current.close(1000, "User ended session");
      wsRef.current = null;
    }

    audioCtxRef.current?.close().catch(() => {});
    audioCtxRef.current = null;

    if (blobUrlRef.current) {
      URL.revokeObjectURL(blobUrlRef.current);
      blobUrlRef.current = "";
    }

    historyRef.current = [];
    optsRef.current.onStatusChange("idle");
  }, [stopSpeaking]);

  useEffect(() => {
    return () => { disconnect(); };
  }, []);

  return { connect, disconnect };
}
