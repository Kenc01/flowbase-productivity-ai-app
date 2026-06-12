import { useRef, useCallback, useEffect } from "react";
import { api } from "../lib/api";

// ─── Types ────────────────────────────────────────────────────────────────────

export type StreamingStatus = "idle" | "connecting" | "recording" | "stopping";

export interface UseAssemblyAIStreamingOptions {
  /** Called on every partial transcript update (live preview) */
  onPartialTranscript: (text: string) => void;
  /** Called when a turn is finalised — insert this into the editor */
  onFinalTranscript: (text: string) => void;
  /** Called on error */
  onError: (message: string) => void;
  /** Called on status transitions */
  onStatusChange: (status: StreamingStatus) => void;
}

// ─── Audio constants ──────────────────────────────────────────────────────────

const SAMPLE_RATE = 16_000;
const FRAME_SAMPLES = 800; // 50 ms @ 16 kHz

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useAssemblyAIStreaming(opts: UseAssemblyAIStreamingOptions) {
  const optsRef = useRef(opts);
  useEffect(() => {
    optsRef.current = opts;
  }, [opts]);

  const wsRef = useRef<WebSocket | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const statusRef = useRef<StreamingStatus>("idle");

  // Track the last inserted final chunk to avoid duplicates
  const lastFinalRef = useRef<string>("");
  // Buffer for accumulating PCM frames before sending
  const frameBufferRef = useRef<Int16Array>(new Int16Array(FRAME_SAMPLES));
  const frameOffsetRef = useRef(0);

  const setStatus = useCallback((s: StreamingStatus) => {
    statusRef.current = s;
    optsRef.current.onStatusChange(s);
  }, []);

  // ── PCM helpers ─────────────────────────────────────────────────────────────

  /** Convert Float32 samples to Int16 PCM */
  function float32ToInt16(float32: Float32Array): Int16Array {
    const int16 = new Int16Array(float32.length);
    for (let i = 0; i < float32.length; i++) {
      const s = Math.max(-1, Math.min(1, float32[i]));
      int16[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
    }
    return int16;
  }

  /** Send a fixed-size Int16 frame over the WebSocket */
  function sendFrame(samples: Int16Array) {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(samples.buffer);
    }
  }

  // ── Cleanup ──────────────────────────────────────────────────────────────────

  const cleanup = useCallback(() => {
    // Stop audio processing
    if (processorRef.current) {
      processorRef.current.disconnect();
      processorRef.current.onaudioprocess = null;
      processorRef.current = null;
    }
    if (sourceRef.current) {
      sourceRef.current.disconnect();
      sourceRef.current = null;
    }
    if (audioCtxRef.current && audioCtxRef.current.state !== "closed") {
      audioCtxRef.current.close();
      audioCtxRef.current = null;
    }
    // Stop mic tracks
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    frameOffsetRef.current = 0;
  }, []);

  // ── Stop recording ───────────────────────────────────────────────────────────

  const stopRecording = useCallback(() => {
    if (statusRef.current === "idle") return;
    setStatus("stopping");

    // Send any remaining buffered frames
    if (
      frameOffsetRef.current > 0 &&
      wsRef.current?.readyState === WebSocket.OPEN
    ) {
      sendFrame(frameBufferRef.current.slice(0, frameOffsetRef.current));
    }

    // Gracefully terminate the AssemblyAI session
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      try {
        wsRef.current.send(JSON.stringify({ type: "Terminate" }));
      } catch {
        // ignore
      }
    }

    cleanup();

    // Close WS after giving server a moment to send the Termination message
    setTimeout(() => {
      wsRef.current?.close();
      wsRef.current = null;
      setStatus("idle");
    }, 1500);
  }, [cleanup, setStatus]);

  // ── Start recording ──────────────────────────────────────────────────────────

  const startRecording = useCallback(async () => {
    if (statusRef.current !== "idle") return;
    setStatus("connecting");
    lastFinalRef.current = "";

    try {
      // 1. Fetch temporary token from our server
      const { token } = await api.get<{ token: string }>("/assemblyai/token");

      // 2. Request microphone
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          sampleRate: SAMPLE_RATE,
          echoCancellation: true,
          noiseSuppression: true,
        },
      });
      streamRef.current = stream;

      // 3. Open WebSocket to AssemblyAI Universal Streaming v3
      // Use u3-rt-pro (Universal-3 Pro Streaming) - recommended for best accuracy & sub-300ms latency
      const wsUrl =
        `wss://streaming.assemblyai.com/v3/ws` +
        `?speech_model=u3-rt-pro&sample_rate=${SAMPLE_RATE}&token=${encodeURIComponent(token)}`;

      const ws = new WebSocket(wsUrl, undefined);
      ws.binaryType = "arraybuffer";
      wsRef.current = ws;

      // 4. Wire WS events
      ws.onopen = () => {
        setStatus("recording");

        // 5. Set up AudioContext + ScriptProcessor for PCM capture
        const ctx = new AudioContext({ sampleRate: SAMPLE_RATE });
        audioCtxRef.current = ctx;

        const source = ctx.createMediaStreamSource(stream);
        sourceRef.current = source;

        // ScriptProcessor is deprecated but universally supported without HTTPS AudioWorklet
        const processor = ctx.createScriptProcessor(4096, 1, 1);
        processorRef.current = processor;

        processor.onaudioprocess = (e) => {
          if (ws.readyState !== WebSocket.OPEN) return;

          const input = e.inputBuffer.getChannelData(0);
          const int16 = float32ToInt16(input);

          // Accumulate into fixed FRAME_SAMPLES chunks
          let offset = 0;
          while (offset < int16.length) {
            const space = FRAME_SAMPLES - frameOffsetRef.current;
            const toCopy = Math.min(space, int16.length - offset);
            frameBufferRef.current.set(
              int16.subarray(offset, offset + toCopy),
              frameOffsetRef.current,
            );
            frameOffsetRef.current += toCopy;
            offset += toCopy;

            if (frameOffsetRef.current === FRAME_SAMPLES) {
              sendFrame(frameBufferRef.current);
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
              // Final — avoid re-inserting the same chunk
              if (transcript && transcript !== lastFinalRef.current) {
                lastFinalRef.current = transcript;
                // Clear partial preview
                optsRef.current.onPartialTranscript("");
                // Insert into editor
                optsRef.current.onFinalTranscript(transcript);
              }
            } else {
              // Partial — show live preview
              optsRef.current.onPartialTranscript(transcript);
            }
          } else if (data.type === "Begin") {
            console.debug("[AssemblyAI] Session began:", data.id);
          } else if (data.type === "Termination") {
            console.debug("[AssemblyAI] Session terminated");
          }
        } catch {
          // ignore malformed messages
        }
      };

      ws.onerror = (ev) => {
        console.error("[AssemblyAI] WS error", ev);
        optsRef.current.onError(
          "Microphone connection lost. Please try again.",
        );
        cleanup();
        wsRef.current = null;
        setStatus("idle");
      };

      ws.onclose = (ev) => {
        if (statusRef.current !== "stopping" && statusRef.current !== "idle") {
          if (ev.code !== 1000 && ev.code !== 1001) {
            optsRef.current.onError(
              `Streaming session closed unexpectedly (${ev.code}). Check your AssemblyAI key.`,
            );
          }
        }
        cleanup();
        wsRef.current = null;
        setStatus("idle");
      };
    } catch (err: any) {
      console.error("[AssemblyAI] startRecording error:", err);
      cleanup();
      wsRef.current = null;
      setStatus("idle");

      const msg =
        err?.message?.includes("ASSEMBLYAI_API_KEY") ||
        err?.message?.includes("not configured")
          ? err.message
          : err?.message?.includes("getUserMedia") ||
              err?.message?.includes("Permission")
            ? "Microphone permission denied. Please allow microphone access and try again."
            : (err?.message ?? "Failed to start recording.");

      optsRef.current.onError(msg);
    }
  }, [cleanup, setStatus]);

  // ── Cleanup on unmount ───────────────────────────────────────────────────────

  useEffect(() => {
    return () => {
      cleanup();
      wsRef.current?.close();
      wsRef.current = null;
    };
  }, [cleanup]);

  return { startRecording, stopRecording };
}
