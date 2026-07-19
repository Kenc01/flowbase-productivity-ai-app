import { useRef, useCallback, useEffect } from "react";

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
const BUFFER_SAMPLES = SAMPLE_RATE * 0.2; // 200ms chunks
const BASE = (import.meta.env.BASE_URL ?? "").replace(/\/$/, "");

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

// Strip markdown so TTS doesn't say "asterisk asterisk" etc.
function stripMarkdown(text: string): string {
  return text
    .replace(/#{1,6}\s+/g, "")
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/\*(.+?)\*/g, "$1")
    .replace(/__(.+?)__/g, "$1")
    .replace(/_(.+?)_/g, "$1")
    .replace(/`{1,3}[^`]*`{1,3}/g, "")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/^[-*•]\s+/gm, "")
    .replace(/^\d+\.\s+/gm, "")
    .replace(/\n{2,}/g, ". ")
    .replace(/\n/g, " ")
    .replace(/\s{2,}/g, " ")
    .trim();
}

// Fallback: pick the most natural browser voice
function pickVoice(): SpeechSynthesisVoice | null {
  const voices = window.speechSynthesis?.getVoices() ?? [];
  if (!voices.length) return null;
  const preferences = [
    "Google UK English Male",
    "Microsoft Guy Online (Natural) - English (United States)",
    "Microsoft Davis Online (Natural) - English (United States)",
    "Microsoft Andrew Online (Natural) - English (United States)",
    "Microsoft Brian Online (Natural) - English (United States)",
    "Google US English",
    "Daniel",
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

  // ── STT / microphone refs ────────────────────────────────────────────────────
  const wsRef = useRef<WebSocket | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const workletRef = useRef<AudioWorkletNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const blobUrlRef = useRef<string>("");
  const activeRef = useRef(false);
  const isSpeakingRef = useRef(false);
  const historyRef = useRef<Array<{ role: string; content: string }>>([]);

  // ── TTS / output refs ────────────────────────────────────────────────────────
  const outputCtxRef = useRef<AudioContext | null>(null);
  const currentSourceRef = useRef<AudioBufferSourceNode | null>(null);
  const audioQueueRef = useRef<string[]>([]);
  const isPlayingTtsRef = useRef(false);
  const ttsAbortRef = useRef(false);

  // ── TTS helpers ──────────────────────────────────────────────────────────────

  const getOutputCtx = useCallback((): AudioContext => {
    if (!outputCtxRef.current || outputCtxRef.current.state === "closed") {
      outputCtxRef.current = new AudioContext();
    }
    return outputCtxRef.current;
  }, []);

  /**
   * Stop all TTS immediately (barge-in support + cleanup).
   * Stops Web Audio playback and clears the sentence queue.
   */
  const stopSpeaking = useCallback(() => {
    ttsAbortRef.current = true;
    audioQueueRef.current = [];
    isPlayingTtsRef.current = false;
    try { currentSourceRef.current?.stop(); } catch {}
    currentSourceRef.current = null;
    if (isSpeakingRef.current) {
      window.speechSynthesis?.cancel();
    }
    isSpeakingRef.current = false;
    // Re-enable after a short delay so barge-in detection settles
    setTimeout(() => { ttsAbortRef.current = false; }, 200);
  }, []);

  /**
   * Play a single sentence via Groq PlayAI TTS (WAV audio over Web Audio API).
   * Falls back to browser speechSynthesis if the API call fails.
   */
  const playOneChunk = useCallback(async (text: string): Promise<void> => {
    return new Promise(async (resolve) => {
      if (ttsAbortRef.current) { resolve(); return; }

      try {
        const response = await fetch(`${BASE}/api/ai-assistant/tts`, {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text, voice: optsRef.current.voice ?? "Fritz-PlayAI" }),
          signal: AbortSignal.timeout(12_000),
        });

        if (!response.ok || ttsAbortRef.current) { resolve(); return; }

        const arrayBuf = await response.arrayBuffer();
        if (ttsAbortRef.current) { resolve(); return; }

        const ctx = getOutputCtx();
        if (ctx.state === "suspended") await ctx.resume();

        const audioBuf = await ctx.decodeAudioData(arrayBuf.slice(0));
        if (ttsAbortRef.current) { resolve(); return; }

        const src = ctx.createBufferSource();
        src.buffer = audioBuf;
        src.connect(ctx.destination);
        currentSourceRef.current = src;
        src.onended = () => { currentSourceRef.current = null; resolve(); };
        src.start();
      } catch {
        // Fallback to browser speechSynthesis
        if (ttsAbortRef.current) { resolve(); return; }
        if (!("speechSynthesis" in window)) { resolve(); return; }
        const utterance = new SpeechSynthesisUtterance(text);
        const v = pickVoice();
        if (v) utterance.voice = v;
        utterance.rate = 0.95;
        utterance.pitch = 0.9;
        utterance.onend = () => resolve();
        utterance.onerror = () => resolve();
        window.speechSynthesis.speak(utterance);
      }
    });
  }, [getOutputCtx]);

  // Keep a stable ref to drainQueue so it can self-recurse without stale closures
  const drainQueueRef = useRef<() => void>(() => {});

  const drainQueue = useCallback(async () => {
    if (isPlayingTtsRef.current || ttsAbortRef.current) return;
    const text = audioQueueRef.current.shift();
    if (!text) {
      isPlayingTtsRef.current = false;
      isSpeakingRef.current = false;
      if (activeRef.current) optsRef.current.onStatusChange("listening");
      return;
    }
    isPlayingTtsRef.current = true;
    await playOneChunk(text);
    isPlayingTtsRef.current = false;
    if (!ttsAbortRef.current && activeRef.current) {
      drainQueueRef.current(); // next sentence
    } else if (!activeRef.current) {
      isSpeakingRef.current = false;
    }
  }, [playOneChunk]);

  // Keep ref in sync with latest drainQueue
  drainQueueRef.current = drainQueue;

  /** Push a sentence into the playback queue; starts draining if idle. */
  const enqueueSentence = useCallback((sentence: string) => {
    if (!sentence.trim()) return;
    audioQueueRef.current.push(sentence);
    if (!isPlayingTtsRef.current) {
      drainQueueRef.current();
    }
  }, []);

  // ── Streaming chat (SSE) → sentence-by-sentence TTS ─────────────────────────

  const sendToGroq = useCallback(
    async (userText: string) => {
      const { onMessage, onStatusChange } = optsRef.current;

      stopSpeaking();
      onStatusChange("thinking");

      onMessage({ id: uid(), role: "user", text: userText, timestamp: new Date() });
      historyRef.current.push({ role: "user", content: userText });

      try {
        const response = await fetch(`${BASE}/api/ai-assistant/chat-stream`, {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userMessage: userText,
            history: historyRef.current.slice(-12),
          }),
        });

        if (!response.ok || !response.body) {
          throw new Error(`Stream failed: ${response.status}`);
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let sseBuffer = "";
        let fullText = "";
        let sentenceCount = 0;

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          sseBuffer += decoder.decode(value, { stream: true });
          // SSE events are separated by double newlines
          const blocks = sseBuffer.split("\n\n");
          sseBuffer = blocks.pop() ?? "";

          for (const block of blocks) {
            if (!block.startsWith("data: ")) continue;
            try {
              const data = JSON.parse(block.slice(6));

              if (data.sentence && activeRef.current) {
                const clean = stripMarkdown(data.sentence);
                if (!clean) continue;
                // Start speaking status on the first sentence
                if (sentenceCount === 0) {
                  isSpeakingRef.current = true;
                  onStatusChange("speaking");
                }
                sentenceCount++;
                enqueueSentence(clean);
              }

              if (data.done && data.fullText) {
                fullText = data.fullText;
              }
            } catch { /* ignore malformed events */ }
          }
        }

        // Add complete message to history and UI after stream ends
        if (fullText) {
          historyRef.current.push({ role: "assistant", content: fullText });
          onMessage({ id: uid(), role: "agent", text: fullText, timestamp: new Date() });
        }

        // If no sentences came through, resume listening manually
        if (sentenceCount === 0) {
          isSpeakingRef.current = false;
          if (activeRef.current) onStatusChange("listening");
        }
        // Otherwise the queue drain will flip status back to "listening" when done
      } catch (err) {
        console.error("Voice chat-stream error:", err);
        const errMsg =
          "I'm having a bit of trouble connecting right now. Give it another shot.";
        onMessage({ id: uid(), role: "agent", text: errMsg, timestamp: new Date() });
        if (activeRef.current) {
          isSpeakingRef.current = true;
          onStatusChange("speaking");
          enqueueSentence(errMsg);
        }
      }
    },
    [stopSpeaking, enqueueSentence]
  );

  // ── Microphone → AssemblyAI streaming STT ────────────────────────────────────

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

        // Drain worklet output silently (don't play mic back to speakers)
        const silent = ctx.createGain();
        silent.gain.value = 0;
        worklet.connect(silent);
        silent.connect(ctx.destination);
        source.connect(worklet);

        // Send buffered PCM16 frames; pause during TTS playback (avoids echo)
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

  // ── Connect session ───────────────────────────────────────────────────────────

  const connect = useCallback(async () => {
    const { masterName, onMessage, onStatusChange, onError } = optsRef.current;

    activeRef.current = true;
    historyRef.current = [];
    onStatusChange("connecting");

    try {
      // Get short-lived AssemblyAI streaming token from our backend
      const { token } = await (async () => {
        const r = await fetch(`${BASE}/api/assemblyai/token`, {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: "{}",
        });
        if (!r.ok) throw new Error("No streaming token");
        return r.json() as Promise<{ token: string }>;
      })();
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
            `${name}, good ${tod}. I'm listening — go ahead.`,
          ];
          const greetText = greets[Math.floor(Math.random() * greets.length)];
          onMessage({ id: uid(), role: "agent", text: greetText, timestamp: new Date() });
          historyRef.current.push({ role: "assistant", content: greetText });
          // Speak greeting through Groq TTS
          isSpeakingRef.current = true;
          onStatusChange("speaking");
          enqueueSentence(greetText);
        } else if (type === "PartialTranscript" || type === "partial_transcript") {
          // Barge-in: user speaks while JARVIS is talking → stop immediately
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
  }, [startMic, stopSpeaking, sendToGroq, enqueueSentence]);

  // ── Disconnect session ────────────────────────────────────────────────────────

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

    outputCtxRef.current?.close().catch(() => {});
    outputCtxRef.current = null;

    if (blobUrlRef.current) {
      URL.revokeObjectURL(blobUrlRef.current);
      blobUrlRef.current = "";
    }

    historyRef.current = [];
    optsRef.current.onStatusChange("idle");
  }, [stopSpeaking]);

  // Cleanup on unmount
  useEffect(() => {
    return () => { disconnect(); };
  }, []);

  return { connect, disconnect };
}
