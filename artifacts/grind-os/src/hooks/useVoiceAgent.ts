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

const SAMPLE_RATE = 16_000;
// Buffer 200ms of audio before sending — AssemblyAI requires min 50ms per chunk
const BUFFER_SAMPLES = SAMPLE_RATE * 0.2; // 3200 samples = 200ms

// AudioWorklet that buffers ~200ms of PCM16 before posting to the main thread
const WORKLET_CODE = `
class JarvisPcmCapture extends AudioWorkletProcessor {
  constructor() {
    super();
    this._buf = [];
    this._bufLen = 0;
    this._target = ${BUFFER_SAMPLES};
  }
  process(inputs) {
    const ch = inputs[0]?.[0];
    if (ch && ch.length > 0) {
      for (let i = 0; i < ch.length; i++) {
        this._buf.push(Math.max(-32768, Math.min(32767, Math.round(ch[i] * 32767))));
      }
      this._bufLen += ch.length;
      if (this._bufLen >= this._target) {
        const i16 = new Int16Array(this._buf);
        this.port.postMessage(i16.buffer, [i16.buffer]);
        this._buf = [];
        this._bufLen = 0;
      }
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

// Strip markdown so TTS doesn't say "asterisk asterisk" etc.
function stripMarkdown(text: string): string {
  return text
    .replace(/#{1,6}\s+/g, "")           // headings
    .replace(/\*\*(.+?)\*\*/g, "$1")     // bold
    .replace(/\*(.+?)\*/g, "$1")         // italic
    .replace(/__(.+?)__/g, "$1")         // bold alt
    .replace(/_(.+?)_/g, "$1")           // italic alt
    .replace(/`{1,3}[^`]*`{1,3}/g, "")  // code
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1") // links
    .replace(/^[-*•]\s+/gm, "")         // bullets
    .replace(/^\d+\.\s+/gm, "")         // numbered lists
    .replace(/\n{2,}/g, ". ")           // double newlines → pause
    .replace(/\n/g, " ")                // single newlines
    .replace(/\s{2,}/g, " ")            // extra whitespace
    .trim();
}

// Pick the most natural-sounding available voice
function pickVoice(): SpeechSynthesisVoice | null {
  const voices = window.speechSynthesis.getVoices();
  if (!voices.length) return null;
  const preferences = [
    "Google UK English Male",
    "Microsoft Guy Online (Natural) - English (United States)",
    "Microsoft Davis Online (Natural) - English (United States)",
    "Microsoft Andrew Online (Natural) - English (United States)",
    "Microsoft Brian Online (Natural) - English (United States)",
    "Microsoft Eric Online (Natural) - English (United States)",
    "Google US English",
    "Microsoft George",
    "Daniel",
    "Google UK English Female",
  ];
  for (const pref of preferences) {
    const v = voices.find((v) => v.name.includes(pref));
    if (v) return v;
  }
  return voices.find((v) => v.lang.startsWith("en")) ?? null;
}

// Split text into natural sentence-length chunks for faster TTS start
function splitIntoChunks(text: string): string[] {
  const sentences = text.match(/[^.!?]+[.!?]+[\s]*/g) ?? [text];
  const chunks: string[] = [];
  let current = "";
  for (const s of sentences) {
    if ((current + s).length > 200 && current.length > 0) {
      chunks.push(current.trim());
      current = s;
    } else {
      current += s;
    }
  }
  if (current.trim()) chunks.push(current.trim());
  return chunks.length > 0 ? chunks : [text];
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
  const speakQueueRef = useRef<string[]>([]);
  const speakingChunkRef = useRef(false);

  // ── TTS via Web Speech API ─────────────────────────────────────────────────

  const stopSpeaking = useCallback(() => {
    speakQueueRef.current = [];
    speakingChunkRef.current = false;
    if (isSpeakingRef.current) {
      window.speechSynthesis.cancel();
      isSpeakingRef.current = false;
    }
  }, []);

  const speakNextChunk = useCallback(() => {
    const chunk = speakQueueRef.current.shift();
    if (!chunk) {
      speakingChunkRef.current = false;
      isSpeakingRef.current = false;
      if (activeRef.current) optsRef.current.onStatusChange("listening");
      return;
    }

    speakingChunkRef.current = true;
    isSpeakingRef.current = true;

    const utterance = new SpeechSynthesisUtterance(chunk);

    const trySetVoice = () => {
      const v = pickVoice();
      if (v) utterance.voice = v;
    };
    trySetVoice();
    if (!utterance.voice) {
      window.speechSynthesis.addEventListener("voiceschanged", trySetVoice, { once: true });
    }

    utterance.rate = 0.95;   // slightly slower than default for clarity
    utterance.pitch = 0.9;   // slightly deeper, more natural male tone
    utterance.volume = 1.0;

    utterance.onend = () => {
      if (speakQueueRef.current.length > 0 && activeRef.current) {
        speakNextChunk();
      } else {
        speakingChunkRef.current = false;
        isSpeakingRef.current = false;
        if (activeRef.current) optsRef.current.onStatusChange("listening");
      }
    };
    utterance.onerror = (e) => {
      if ((e as any).error === "interrupted") return;
      speakingChunkRef.current = false;
      isSpeakingRef.current = false;
      if (activeRef.current) optsRef.current.onStatusChange("listening");
    };

    window.speechSynthesis.speak(utterance);
  }, []);

  const speak = useCallback(
    (text: string) => {
      stopSpeaking();
      if (!("speechSynthesis" in window) || !text.trim()) return;

      const cleaned = stripMarkdown(text);
      if (!cleaned.trim()) return;

      const chunks = splitIntoChunks(cleaned);
      speakQueueRef.current = chunks;
      isSpeakingRef.current = true;
      optsRef.current.onStatusChange("speaking");
      speakNextChunk();
    },
    [stopSpeaking, speakNextChunk]
  );

  // ── Groq chat via backend ──────────────────────────────────────────────────

  const sendToGroq = useCallback(
    async (userText: string) => {
      const { onMessage, onStatusChange } = optsRef.current;

      stopSpeaking();
      onStatusChange("thinking");

      onMessage({ id: uid(), role: "user", text: userText, timestamp: new Date() });
      historyRef.current.push({ role: "user", content: userText });

      try {
        const data = await api.post<{ message: string; actions: any[] }>(
          "/ai-assistant/chat",
          {
            userMessage: userText,
            history: historyRef.current.slice(-12),
            voiceMode: true,
          }
        );

        const responseText =
          data.message?.trim() ||
          "I had a small hiccup — give me a moment and try again.";

        historyRef.current.push({ role: "assistant", content: responseText });
        onMessage({
          id: uid(),
          role: "agent",
          text: responseText,
          timestamp: new Date(),
        });

        if (activeRef.current) speak(responseText);
      } catch {
        const errMsg = "I'm having a bit of trouble connecting right now. Give it another shot.";
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

        // Drain output silently
        const silent = ctx.createGain();
        silent.gain.value = 0;
        worklet.connect(silent);
        silent.connect(ctx.destination);
        source.connect(worklet);

        // Send buffered PCM16 frames — worklet already batches to 200ms
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
        onError("Microphone access denied. Please allow microphone use in your browser.");
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
      const { token } = await api.post<{ token: string }>("/assemblyai/token", {});
      if (!token) throw new Error("No streaming token received from server");

      const ctx = new (window.AudioContext as any)({ sampleRate: SAMPLE_RATE });
      audioCtxRef.current = ctx;

      const blob = new Blob([WORKLET_CODE], { type: "application/javascript" });
      const blobUrl = URL.createObjectURL(blob);
      blobUrlRef.current = blobUrl;
      await ctx.audioWorklet.addModule(blobUrl);
      URL.revokeObjectURL(blobUrl);
      blobUrlRef.current = "";

      const ws = new WebSocket(
        `wss://streaming.assemblyai.com/v3/ws?token=${encodeURIComponent(token)}&sample_rate=${SAMPLE_RATE}&encoding=pcm_s16le`
      );
      wsRef.current = ws;

      ws.onopen = () => {
        startMic(ws, ctx);
      };

      ws.onmessage = async (evt) => {
        let msg: any;
        try { msg = JSON.parse(evt.data as string); } catch { return; }

        const type: string = msg.message_type ?? msg.type ?? "";

        if (type === "SessionBegins" || type === "session.started") {
          const name = masterName.trim() || "there";
          const hour = new Date().getHours();
          const tod = hour < 12 ? "morning" : hour < 17 ? "afternoon" : "evening";
          const greets = [
            `Hey ${name}, good ${tod}. I'm ready whenever you are.`,
            `Good ${tod}, ${name}. What can I help you with today?`,
            `${name}, good ${tod}. I'm listening.`,
          ];
          const greetText = greets[Math.floor(Math.random() * greets.length)];
          onMessage({ id: uid(), role: "agent", text: greetText, timestamp: new Date() });
          historyRef.current.push({ role: "assistant", content: greetText });
          speak(greetText);
        } else if (type === "PartialTranscript" || type === "partial_transcript") {
          // Barge-in: user speaking while JARVIS talks → stop immediately
          if (isSpeakingRef.current && (msg.text ?? "").trim().length > 3) {
            stopSpeaking();
          }
        } else if (type === "FinalTranscript" || type === "final_transcript") {
          const text: string = (msg.text ?? "").trim();
          if (text && text.length > 1) {
            await sendToGroq(text);
          }
        } else if (msg.error) {
          console.error("AssemblyAI STT error:", msg.error);
        }
      };

      ws.onerror = () => {
        if (activeRef.current) {
          onError("Voice connection lost. Please try again.");
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
      optsRef.current.onError(err?.message ?? "Failed to start voice session");
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
      try { wsRef.current.send(JSON.stringify({ terminate_session: true })); } catch {}
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
