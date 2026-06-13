import { useRef, useCallback, useEffect, useState } from "react";
import { api } from "../lib/api";

// ─── Types ────────────────────────────────────────────────────────────────────

export type VoiceConvStatus =
  | "idle"          // fully stopped
  | "connecting"    // opening mic + ws
  | "listening"     // mic open, waiting for speech
  | "thinking"      // sent to AI, waiting for response
  | "speaking"      // TTS is playing AI response
  | "stopping";     // shutting down

export interface VoiceConvMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

export interface UseVoiceConversationOptions {
  onMessage: (msg: VoiceConvMessage) => void;
  onStatusChange: (s: VoiceConvStatus) => void;
  onPartialTranscript: (t: string) => void;
  onError: (msg: string) => void;
  /** existing chat history to send as context */
  getHistory: () => Array<{ role: string; content: string }>;
}

// ─── Audio constants ──────────────────────────────────────────────────────────

const SAMPLE_RATE = 16_000;
const FRAME_SAMPLES = 800;

function uid() { return Math.random().toString(36).slice(2, 12); }

function float32ToInt16(f: Float32Array): Int16Array {
  const out = new Int16Array(f.length);
  for (let i = 0; i < f.length; i++) {
    const s = Math.max(-1, Math.min(1, f[i]));
    out[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
  }
  return out;
}

// ─── TTS ──────────────────────────────────────────────────────────────────────

function speakText(
  text: string,
  onStart: () => void,
  onEnd: () => void,
  onError: () => void
): SpeechSynthesisUtterance {
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);

  // Prefer a natural-sounding voice
  const voices = window.speechSynthesis.getVoices();
  const preferred = [
    "Google US English",
    "Microsoft Aria Online (Natural) - English (United States)",
    "Samantha",
    "Alex",
    "Daniel",
    "Karen",
    "Moira",
  ];
  for (const name of preferred) {
    const v = voices.find(v => v.name === name);
    if (v) { utterance.voice = v; break; }
  }

  // If no preferred, pick first English voice
  if (!utterance.voice) {
    const eng = voices.find(v => v.lang.startsWith("en"));
    if (eng) utterance.voice = eng;
  }

  utterance.rate = 1.05;
  utterance.pitch = 1.0;
  utterance.volume = 1.0;

  utterance.onstart = onStart;
  utterance.onend = onEnd;
  utterance.onerror = () => onError();
  window.speechSynthesis.speak(utterance);
  return utterance;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useVoiceConversation(opts: UseVoiceConversationOptions) {
  const optsRef = useRef(opts);
  useEffect(() => { optsRef.current = opts; }, [opts]);

  const statusRef = useRef<VoiceConvStatus>("idle");
  const wsRef = useRef<WebSocket | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const frameBufferRef = useRef(new Int16Array(FRAME_SAMPLES));
  const frameOffsetRef = useRef(0);
  const lastFinalRef = useRef("");
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const activeRef = useRef(false); // true while voice mode is on
  const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const setStatus = useCallback((s: VoiceConvStatus) => {
    statusRef.current = s;
    optsRef.current.onStatusChange(s);
  }, []);

  // ── Audio cleanup ────────────────────────────────────────────────────────────

  const cleanupAudio = useCallback(() => {
    silenceTimerRef.current && clearTimeout(silenceTimerRef.current);
    processorRef.current?.disconnect();
    if (processorRef.current) processorRef.current.onaudioprocess = null;
    processorRef.current = null;
    sourceRef.current?.disconnect();
    sourceRef.current = null;
    if (audioCtxRef.current?.state !== "closed") audioCtxRef.current?.close();
    audioCtxRef.current = null;
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
    frameOffsetRef.current = 0;
  }, []);

  // ── Close WS ─────────────────────────────────────────────────────────────────

  const closeWs = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      try { wsRef.current.send(JSON.stringify({ type: "Terminate" })); } catch {}
      setTimeout(() => { wsRef.current?.close(); wsRef.current = null; }, 1200);
    } else {
      wsRef.current = null;
    }
  }, []);

  // ── Open microphone + WS session ─────────────────────────────────────────────

  const openListeningSession = useCallback(async () => {
    if (!activeRef.current) return;
    setStatus("connecting");
    lastFinalRef.current = "";
    optsRef.current.onPartialTranscript("");

    try {
      const { token } = await api.get<{ token: string }>("/assemblyai/token");

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { channelCount: 1, sampleRate: SAMPLE_RATE, echoCancellation: true, noiseSuppression: true },
      });
      streamRef.current = stream;

      const wsUrl =
        `wss://streaming.assemblyai.com/v3/ws` +
        `?speech_model=u3-rt-pro&sample_rate=${SAMPLE_RATE}&token=${encodeURIComponent(token)}`;

      const ws = new WebSocket(wsUrl);
      ws.binaryType = "arraybuffer";
      wsRef.current = ws;

      ws.onopen = () => {
        if (!activeRef.current) { ws.close(); return; }
        setStatus("listening");

        const ctx = new AudioContext({ sampleRate: SAMPLE_RATE });
        audioCtxRef.current = ctx;
        const source = ctx.createMediaStreamSource(stream);
        sourceRef.current = source;
        const processor = ctx.createScriptProcessor(4096, 1, 1);
        processorRef.current = processor;

        processor.onaudioprocess = (e) => {
          if (ws.readyState !== WebSocket.OPEN) return;
          const input = e.inputBuffer.getChannelData(0);
          const int16 = float32ToInt16(input);
          let offset = 0;
          while (offset < int16.length) {
            const space = FRAME_SAMPLES - frameOffsetRef.current;
            const toCopy = Math.min(space, int16.length - offset);
            frameBufferRef.current.set(int16.subarray(offset, offset + toCopy), frameOffsetRef.current);
            frameOffsetRef.current += toCopy;
            offset += toCopy;
            if (frameOffsetRef.current === FRAME_SAMPLES) {
              if (ws.readyState === WebSocket.OPEN) ws.send(frameBufferRef.current.buffer);
              frameOffsetRef.current = 0;
            }
          }
        };

        source.connect(processor);
        processor.connect(ctx.destination);
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data as string);
          if (data.type === "Turn") {
            const transcript: string = data.transcript ?? "";
            if (data.end_of_turn) {
              if (transcript && transcript.trim() && transcript !== lastFinalRef.current) {
                lastFinalRef.current = transcript;
                optsRef.current.onPartialTranscript("");
                // Close the mic session, then send to AI
                handleFinalTurn(transcript.trim());
              }
            } else {
              optsRef.current.onPartialTranscript(transcript);
            }
          }
        } catch {}
      };

      ws.onerror = () => {
        if (activeRef.current) {
          optsRef.current.onError("Microphone connection lost.");
        }
        cleanupAudio();
        setStatus(activeRef.current ? "idle" : "idle");
      };

      ws.onclose = (ev) => {
        cleanupAudio();
        wsRef.current = null;
        // If we're in "thinking" or "speaking" mode, don't restart — we closed intentionally
        if (statusRef.current === "thinking" || statusRef.current === "speaking" || statusRef.current === "stopping") return;
        if (activeRef.current) {
          // unexpected close — re-open
          setTimeout(() => { if (activeRef.current) openListeningSession(); }, 1500);
        }
      };
    } catch (err: any) {
      cleanupAudio();
      if (activeRef.current) {
        const msg = err?.message?.includes("getUserMedia") || err?.message?.includes("Permission")
          ? "Microphone permission denied."
          : (err?.message ?? "Failed to open microphone.");
        optsRef.current.onError(msg);
        setStatus("idle");
        activeRef.current = false;
      }
    }
  }, [cleanupAudio, setStatus]);

  // ── Handle a final spoken turn ─────────────────────────────────────────────

  const handleFinalTurn = useCallback(async (transcript: string) => {
    if (!activeRef.current) return;

    // Stop mic
    cleanupAudio();
    if (frameOffsetRef.current > 0 && wsRef.current?.readyState === WebSocket.OPEN) {
      try { wsRef.current.send(frameBufferRef.current.slice(0, frameOffsetRef.current).buffer); } catch {}
    }
    closeWs();

    // Emit user message
    const userMsg: VoiceConvMessage = { id: uid(), role: "user", content: transcript, timestamp: new Date() };
    optsRef.current.onMessage(userMsg);

    setStatus("thinking");

    try {
      const history = optsRef.current.getHistory();
      const data = await api.post<{ message: string; actions?: any[] }>("/ai-assistant/chat", {
        userMessage: transcript,
        history,
      });

      const replyText = data.message ?? "I'm here. Tell me more.";

      const aiMsg: VoiceConvMessage = { id: uid(), role: "assistant", content: replyText, timestamp: new Date() };
      optsRef.current.onMessage(aiMsg);

      if (!activeRef.current) return;

      // Speak the response
      setStatus("speaking");
      // Truncate very long responses for speech (keep first ~400 chars / ~2-3 sentences)
      const spokenText = truncateForSpeech(replyText);

      utteranceRef.current = speakText(
        spokenText,
        () => {},
        () => {
          // After speaking, re-open mic for next turn
          utteranceRef.current = null;
          if (activeRef.current) {
            setTimeout(() => { if (activeRef.current) openListeningSession(); }, 400);
          }
        },
        () => {
          utteranceRef.current = null;
          if (activeRef.current) {
            setTimeout(() => { if (activeRef.current) openListeningSession(); }, 400);
          }
        }
      );
    } catch (err: any) {
      optsRef.current.onError("AI response failed. Please try again.");
      if (activeRef.current) {
        setStatus("idle");
        activeRef.current = false;
      }
    }
  }, [cleanupAudio, closeWs, setStatus, openListeningSession]);

  // ── Start voice conversation ───────────────────────────────────────────────

  const startVoiceMode = useCallback(async () => {
    if (statusRef.current !== "idle") return;
    activeRef.current = true;
    openListeningSession();
  }, [openListeningSession]);

  // ── Stop voice conversation ────────────────────────────────────────────────

  const stopVoiceMode = useCallback(() => {
    activeRef.current = false;
    window.speechSynthesis.cancel();
    utteranceRef.current = null;
    cleanupAudio();
    closeWs();
    optsRef.current.onPartialTranscript("");
    setStatus("idle");
  }, [cleanupAudio, closeWs, setStatus]);

  // ── Cleanup on unmount ────────────────────────────────────────────────────

  useEffect(() => {
    return () => {
      activeRef.current = false;
      window.speechSynthesis.cancel();
      cleanupAudio();
      wsRef.current?.close();
      wsRef.current = null;
    };
  }, [cleanupAudio]);

  return { startVoiceMode, stopVoiceMode };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function truncateForSpeech(text: string): string {
  // Remove markdown symbols
  const clean = text
    .replace(/#{1,6}\s/g, "")
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/\*(.*?)\*/g, "$1")
    .replace(/`(.*?)`/g, "$1")
    .replace(/```[\s\S]*?```/g, "")
    .replace(/^\s*[-•]\s/gm, "")
    .replace(/\n{2,}/g, ". ")
    .replace(/\n/g, " ")
    .trim();

  // Limit to ~400 chars
  if (clean.length <= 420) return clean;
  const truncated = clean.slice(0, 420);
  const lastSentence = truncated.lastIndexOf(".");
  if (lastSentence > 200) return truncated.slice(0, lastSentence + 1);
  return truncated + "…";
}
