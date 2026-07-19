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

// ── Constants ─────────────────────────────────────────────────────────────────

const SAMPLE_RATE = 16_000;
const BUFFER_SAMPLES = SAMPLE_RATE * 0.2; // 200 ms per worklet flush
const BASE = (import.meta.env.BASE_URL ?? "").replace(/\/$/, "");

// ── AudioWorklet (buffers 200 ms of PCM16 before posting) ────────────────────

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

// ── Utilities ─────────────────────────────────────────────────────────────────

function uid() {
  return Math.random().toString(36).slice(2, 12) + Date.now().toString(36);
}

/** Strip markdown so TTS doesn't say "asterisk asterisk" */
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

/** Split cleaned text into sentence-length chunks for sequential TTS */
function splitSentences(text: string): string[] {
  if (!text.trim()) return [];
  const matches = text.match(/[^.!?]+[.!?]+\s*/g) ?? [];
  const sentences = matches.map((s) => s.trim()).filter((s) => s.length > 1);
  // Append trailing text that had no sentence-ending punctuation
  const covered = matches.join("").length;
  const remainder = text.slice(covered).trim();
  if (remainder.length > 1) sentences.push(remainder);
  return sentences.length ? sentences : [text.trim()];
}

/** Pick the best available browser voice (fallback only) */
function pickBrowserVoice(): SpeechSynthesisVoice | null {
  const voices = window.speechSynthesis?.getVoices() ?? [];
  const preferences = [
    "Google UK English Male",
    "Microsoft Guy Online (Natural) - English (United States)",
    "Microsoft Davis Online (Natural) - English (United States)",
    "Google US English",
    "Daniel",
  ];
  for (const name of preferences) {
    const v = voices.find((v) => v.name.includes(name));
    if (v) return v;
  }
  return voices.find((v) => v.lang.startsWith("en")) ?? null;
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useVoiceAgent(opts: UseVoiceAgentOptions) {
  const optsRef = useRef(opts);
  useEffect(() => { optsRef.current = opts; });

  // STT / microphone
  const wsRef        = useRef<WebSocket | null>(null);
  const micCtxRef    = useRef<AudioContext | null>(null);
  const workletRef   = useRef<AudioWorkletNode | null>(null);
  const streamRef    = useRef<MediaStream | null>(null);
  const blobUrlRef   = useRef<string>("");

  // Session state
  const activeRef      = useRef(false);
  const isSpeakingRef  = useRef(false);
  const historyRef     = useRef<Array<{ role: string; content: string }>>([]);

  // TTS / output audio
  const outCtxRef         = useRef<AudioContext | null>(null);
  const currentSrcRef     = useRef<AudioBufferSourceNode | null>(null);
  const audioQueueRef     = useRef<string[]>([]);
  const isPlayingTtsRef   = useRef(false);
  const ttsAbortRef       = useRef(false);

  // ── Stop all TTS (barge-in + cleanup) ─────────────────────────────────────

  const stopSpeaking = useCallback(() => {
    ttsAbortRef.current = true;
    audioQueueRef.current = [];
    isPlayingTtsRef.current = false;
    try { currentSrcRef.current?.stop(); } catch {}
    currentSrcRef.current = null;
    if (isSpeakingRef.current) window.speechSynthesis?.cancel();
    isSpeakingRef.current = false;
    // Re-enable after a short settle period
    setTimeout(() => { ttsAbortRef.current = false; }, 200);
  }, []);

  // ── Play one sentence via Groq PlayAI TTS ─────────────────────────────────
  // Falls back to browser speechSynthesis if the API call fails.

  const playOneChunk = useCallback(async (text: string): Promise<void> => {
    return new Promise(async (resolve) => {
      if (ttsAbortRef.current) { resolve(); return; }

      try {
        const res = await fetch(`${BASE}/api/ai-assistant/tts`, {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            text,
            voice: optsRef.current.voice ?? "Fritz-PlayAI",
          }),
          signal: AbortSignal.timeout(12_000),
        });

        if (!res.ok || ttsAbortRef.current) { resolve(); return; }

        const arrayBuf = await res.arrayBuffer();
        if (ttsAbortRef.current) { resolve(); return; }

        // Use the output context that was pre-created during connect()
        const ctx = outCtxRef.current;
        if (!ctx || ctx.state === "closed") { resolve(); return; }
        if (ctx.state === "suspended") await ctx.resume();
        if (ttsAbortRef.current) { resolve(); return; }

        const audioBuf = await ctx.decodeAudioData(arrayBuf.slice(0));
        if (ttsAbortRef.current) { resolve(); return; }

        const src = ctx.createBufferSource();
        src.buffer = audioBuf;
        src.connect(ctx.destination);
        currentSrcRef.current = src;
        src.onended = () => { currentSrcRef.current = null; resolve(); };
        src.start();
      } catch {
        // ── Fallback: browser speechSynthesis ──────────────────────────────
        if (ttsAbortRef.current || !("speechSynthesis" in window)) {
          resolve(); return;
        }
        const utterance = new SpeechSynthesisUtterance(text);
        const v = pickBrowserVoice();
        if (v) utterance.voice = v;
        utterance.rate = 0.95;
        utterance.pitch = 0.9;
        utterance.onend = () => resolve();
        utterance.onerror = () => resolve();
        window.speechSynthesis.speak(utterance);
      }
    });
  }, []);

  // ── Sentence queue drain (plays one chunk at a time) ──────────────────────

  // Self-referencing via a ref so the async recursion is always latest.
  const drainRef = useRef<() => void>(() => {});

  const drain = useCallback(async () => {
    if (isPlayingTtsRef.current || ttsAbortRef.current) return;
    const text = audioQueueRef.current.shift();
    if (!text) {
      // Queue empty — session goes back to listening
      isPlayingTtsRef.current = false;
      isSpeakingRef.current = false;
      if (activeRef.current) optsRef.current.onStatusChange("listening");
      return;
    }
    isPlayingTtsRef.current = true;
    await playOneChunk(text);
    isPlayingTtsRef.current = false;
    if (!ttsAbortRef.current && activeRef.current) {
      drainRef.current(); // next sentence
    } else {
      isSpeakingRef.current = false;
    }
  }, [playOneChunk]);

  // Keep the ref in sync with the latest drain callback
  drainRef.current = drain;

  /** Push a sentence into the TTS playback queue and start draining if idle */
  const enqueueSentence = useCallback((sentence: string) => {
    if (!sentence.trim()) return;
    audioQueueRef.current.push(sentence);
    if (!isPlayingTtsRef.current) drainRef.current();
  }, []);

  // ── Chat — uses the full /chat endpoint so tool calls work ───────────────
  // (Asking to "create a schedule" triggers create_schedule_block /
  //  create_calendar_event tools. The streaming /chat-stream endpoint doesn't
  //  handle tool calls, which caused the "stays on listening" bug.)

  const sendToAI = useCallback(async (userText: string) => {
    const { onMessage, onStatusChange } = optsRef.current;

    stopSpeaking();
    onStatusChange("thinking");

    onMessage({ id: uid(), role: "user", text: userText, timestamp: new Date() });
    historyRef.current.push({ role: "user", content: userText });

    try {
      const res = await fetch(`${BASE}/api/ai-assistant/chat`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userMessage: userText,
          history: historyRef.current.slice(-12),
          voiceMode: true,
        }),
      });

      if (!res.ok) {
        const body = await res.text().catch(() => "");
        throw new Error(`API ${res.status}: ${body}`);
      }

      const data = (await res.json()) as { message: string; actions?: any[] };
      const replyText =
        (data.message ?? "").trim() ||
        "I had a small hiccup — give it another shot.";

      historyRef.current.push({ role: "assistant", content: replyText });
      onMessage({ id: uid(), role: "agent", text: replyText, timestamp: new Date() });

      if (!activeRef.current) return;

      // Split into sentences and queue each for Groq TTS
      const sentences = splitSentences(stripMarkdown(replyText));
      isSpeakingRef.current = true;
      onStatusChange("speaking");
      for (const s of sentences) enqueueSentence(s);
    } catch (err) {
      console.error("Voice chat error:", err);
      const msg = "I'm having a bit of trouble right now. Give it another shot.";
      onMessage({ id: uid(), role: "agent", text: msg, timestamp: new Date() });
      if (activeRef.current) {
        isSpeakingRef.current = true;
        onStatusChange("speaking");
        enqueueSentence(msg);
      }
    }
  }, [stopSpeaking, enqueueSentence]);

  // ── Microphone → AssemblyAI streaming STT ────────────────────────────────

  const startMic = useCallback(async (ws: WebSocket, ctx: AudioContext) => {
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

      // Route worklet output to silence so mic isn't looped to speakers
      const silent = ctx.createGain();
      silent.gain.value = 0;
      worklet.connect(silent);
      silent.connect(ctx.destination);
      source.connect(worklet);

      // Stream PCM16 to AssemblyAI, but NOT while JARVIS is speaking (avoid echo)
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
  }, []);

  // ── Connect ───────────────────────────────────────────────────────────────

  const connect = useCallback(async () => {
    const { masterName, onMessage, onStatusChange, onError } = optsRef.current;

    activeRef.current = true;
    historyRef.current = [];
    onStatusChange("connecting");

    try {
      // Fetch a short-lived AssemblyAI streaming token
      const tokenRes = await fetch(`${BASE}/api/assemblyai/token`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: "{}",
      });
      if (!tokenRes.ok) throw new Error("Could not get streaming token");
      const { token } = (await tokenRes.json()) as { token: string };
      if (!token) throw new Error("Empty streaming token");

      // ── Create AudioContexts during this user-gesture handler ────────────
      // (Browsers block AudioContext.resume() outside a user gesture — doing
      //  it here while handling the "start voice" click keeps it unlocked.)
      const micCtx = new (window.AudioContext as any)({ sampleRate: SAMPLE_RATE });
      micCtxRef.current = micCtx;

      // Separate output context at the system's native rate for best TTS quality
      const outCtx = new AudioContext();
      outCtxRef.current = outCtx;

      // Register the PCM worklet
      const blob = new Blob([WORKLET_CODE], { type: "application/javascript" });
      const blobUrl = URL.createObjectURL(blob);
      blobUrlRef.current = blobUrl;
      await micCtx.audioWorklet.addModule(blobUrl);
      URL.revokeObjectURL(blobUrl);
      blobUrlRef.current = "";

      // Open AssemblyAI streaming WebSocket
      const ws = new WebSocket(
        `wss://streaming.assemblyai.com/v3/ws` +
        `?token=${encodeURIComponent(token)}` +
        `&sample_rate=${SAMPLE_RATE}` +
        `&encoding=pcm_s16le`
      );
      wsRef.current = ws;

      ws.onopen = () => startMic(ws, micCtx);

      ws.onmessage = async (evt) => {
        let msg: any;
        try { msg = JSON.parse(evt.data as string); } catch { return; }
        const type: string = msg.message_type ?? msg.type ?? "";

        if (type === "SessionBegins" || type === "session.started") {
          // Greet the user
          const name = masterName.trim() || "there";
          const h = new Date().getHours();
          const tod = h < 12 ? "morning" : h < 17 ? "afternoon" : "evening";
          const greets = [
            `Hey ${name}, good ${tod}. I'm ready whenever you are.`,
            `Good ${tod}, ${name}. What can I help you with today?`,
            `${name}, good ${tod}. I'm listening — go ahead.`,
          ];
          const greetText = greets[Math.floor(Math.random() * greets.length)];
          onMessage({ id: uid(), role: "agent", text: greetText, timestamp: new Date() });
          historyRef.current.push({ role: "assistant", content: greetText });
          isSpeakingRef.current = true;
          onStatusChange("speaking");
          enqueueSentence(greetText);

        } else if (type === "PartialTranscript" || type === "partial_transcript") {
          // Barge-in: cut JARVIS off if user starts talking
          if (isSpeakingRef.current && (msg.text ?? "").trim().length > 3) {
            stopSpeaking();
          }

        } else if (type === "FinalTranscript" || type === "final_transcript") {
          const text: string = (msg.text ?? "").trim();
          if (text.length > 1) await sendToAI(text);

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
  }, [startMic, stopSpeaking, sendToAI, enqueueSentence]);

  // ── Disconnect ────────────────────────────────────────────────────────────

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

    micCtxRef.current?.close().catch(() => {});
    micCtxRef.current = null;

    outCtxRef.current?.close().catch(() => {});
    outCtxRef.current = null;

    if (blobUrlRef.current) {
      URL.revokeObjectURL(blobUrlRef.current);
      blobUrlRef.current = "";
    }

    historyRef.current = [];
    optsRef.current.onStatusChange("idle");
  }, [stopSpeaking]);

  // Cleanup on unmount
  useEffect(() => () => { disconnect(); }, []);

  return { connect, disconnect };
}
