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

const SAMPLE_RATE = 24_000;

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

function buildSystemPrompt(masterName: string): string {
  const name = masterName.trim() || "sir";
  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  const time = new Date().toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
  });

  return `You are JARVIS — a relentless personal AI system serving Master ${name}. You are precise, direct, and capable.

Today is ${today}. Current time: ${time}.

IDENTITY:
- Always address the user as "Master ${name}". Never use their first name alone.
- Speak with quiet confidence. No filler phrases, no unnecessary enthusiasm.
- You are here to help them stay focused, on track, and executing on goals.

VOICE RULES — follow exactly:
- No markdown, no asterisks, no bullets, no hashtags. Speak naturally as a person would.
- Keep responses concise: one to three sentences unless they ask for detail.
- Round numbers when speaking: say "around nine in the morning" not "9 colon 00 AM".
- No exclamation marks. Stay measured.
- When completing an action: say "Done, Master ${name}." When confirming: say "Understood." Keep confirmations crisp.
- When they are behind on goals, call it out honestly and redirect. When they are doing well, acknowledge it briefly.

CAPABILITIES:
- Read their calendar, tasks, and notes to give personalized, context-aware help.
- Create tasks, calendar events, and notes on their behalf.
- Build daily schedules with time blocks.
- Provide honest accountability and motivation.
- When asked to plan their day, read their tasks first, then propose a concrete schedule with specific time blocks.`;
}

const VOICE_TOOLS = [
  {
    type: "function",
    function: {
      name: "get_schedule",
      description:
        "Get the user's calendar events. Use when asked about their schedule, today's plan, upcoming events, or what they have this week.",
      parameters: {
        type: "object",
        properties: {
          filter: {
            type: "string",
            enum: ["today", "week", "all"],
            description: "Which events to fetch.",
          },
        },
        required: ["filter"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_tasks",
      description:
        "Get the user's Kanban tasks. Use when asked about their to-do list, what they need to do, work in progress, or tasks pending.",
      parameters: {
        type: "object",
        properties: {
          filter: {
            type: "string",
            enum: ["all", "todo", "in_progress"],
            description: "Which tasks to show.",
          },
        },
        required: ["filter"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_notes",
      description: "Get the user's recent notes.",
      parameters: {
        type: "object",
        properties: {
          limit: {
            type: "number",
            description: "Max notes to return, default 5.",
          },
        },
        required: [],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "create_kanban_task",
      description:
        "Create a new task on the user's Kanban board. Use when they ask to add a task, to-do, or action item.",
      parameters: {
        type: "object",
        properties: {
          title: { type: "string", description: "Short task title" },
          priority: {
            type: "string",
            enum: ["low", "medium", "high"],
            description: "Task priority",
          },
        },
        required: ["title"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "create_calendar_event",
      description: "Add an event or reminder to the user's calendar.",
      parameters: {
        type: "object",
        properties: {
          title: { type: "string" },
          date: {
            type: "string",
            description: "Date in YYYY-MM-DD format",
          },
          type: {
            type: "string",
            enum: ["task", "event", "reminder"],
          },
        },
        required: ["title", "date"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_daily_schedule",
      description:
        "Read the user's Daily Schedule time blocks for a given date.",
      parameters: {
        type: "object",
        properties: {
          date: {
            type: "string",
            description: "Date in YYYY-MM-DD format",
          },
        },
        required: ["date"],
      },
    },
  },
];

function pcm16ToFloat32(buffer: ArrayBuffer): Float32Array {
  const i16 = new Int16Array(buffer);
  const f32 = new Float32Array(i16.length);
  for (let i = 0; i < i16.length; i++) f32[i] = i16[i] / 32768;
  return f32;
}

function b64ToArrayBuffer(b64: string): ArrayBuffer {
  const bin = atob(b64);
  const buf = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) buf[i] = bin.charCodeAt(i);
  return buf.buffer;
}

function arrayBufferToB64(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let str = "";
  for (let i = 0; i < bytes.length; i++) str += String.fromCharCode(bytes[i]);
  return btoa(str);
}

export function useVoiceAgent(opts: UseVoiceAgentOptions) {
  const optsRef = useRef(opts);
  useEffect(() => {
    optsRef.current = opts;
  });

  const wsRef = useRef<WebSocket | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const workletRef = useRef<AudioWorkletNode | null>(null);
  const gainRef = useRef<GainNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const playQueueRef = useRef<ArrayBuffer[]>([]);
  const isPlayingRef = useRef(false);
  const blobUrlRef = useRef<string>("");
  const playbackSrcRef = useRef<AudioBufferSourceNode | null>(null);

  const playNextChunk = useCallback(() => {
    const ctx = audioCtxRef.current;
    if (!ctx || playQueueRef.current.length === 0) {
      isPlayingRef.current = false;
      return;
    }
    isPlayingRef.current = true;
    const chunk = playQueueRef.current.shift()!;
    const samples = pcm16ToFloat32(chunk);
    const audioBuf = ctx.createBuffer(1, samples.length, SAMPLE_RATE);
    audioBuf.copyToChannel(samples, 0);
    const src = ctx.createBufferSource();
    src.buffer = audioBuf;
    src.connect(ctx.destination);
    playbackSrcRef.current = src;
    src.onended = () => {
      playbackSrcRef.current = null;
      playNextChunk();
    };
    src.start();
  }, []);

  const queueAudio = useCallback(
    (b64: string) => {
      const buf = b64ToArrayBuffer(b64);
      playQueueRef.current.push(buf);
      if (!isPlayingRef.current) playNextChunk();
    },
    [playNextChunk]
  );

  const clearAudioQueue = useCallback(() => {
    playQueueRef.current = [];
    isPlayingRef.current = false;
    try {
      playbackSrcRef.current?.stop();
    } catch {}
    playbackSrcRef.current = null;
  }, []);

  const executeTool = useCallback(async (name: string, args: any): Promise<string> => {
    try {
      const result = await api.post<{ result: any; summary: string }>(
        "/ai-assistant/voice-tools",
        { tool: name, args }
      );
      return JSON.stringify(result.result ?? result);
    } catch (e: any) {
      return JSON.stringify({ error: e?.message ?? "Tool execution failed" });
    }
  }, []);

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

      const silentGain = ctx.createGain();
      silentGain.gain.value = 0;
      gainRef.current = silentGain;

      worklet.port.onmessage = (e: MessageEvent) => {
        if (ws.readyState === WebSocket.OPEN) {
          const b64 = arrayBufferToB64(e.data as ArrayBuffer);
          ws.send(JSON.stringify({ type: "input_audio", audio: b64 }));
        }
      };

      source.connect(worklet);
      worklet.connect(silentGain);
      silentGain.connect(ctx.destination);

      onStatusChange("listening");
    } catch (err: any) {
      onError("Microphone access denied. Please allow microphone use in your browser settings.");
      onStatusChange("idle");
    }
  }, []);

  const connect = useCallback(async () => {
    const { masterName, voice = "Brian", onMessage, onStatusChange, onError } =
      optsRef.current;

    onStatusChange("connecting");

    try {
      const { token } = await api.get<{ token: string }>(
        "/assemblyai/voice-agent-token"
      );
      if (!token) throw new Error("No voice agent token received from server");

      const ws = new WebSocket(
        `wss://agents.assemblyai.com/v1/ws?token=${encodeURIComponent(token)}`
      );
      wsRef.current = ws;

      const ctx = new (window.AudioContext as any)({ sampleRate: SAMPLE_RATE });
      audioCtxRef.current = ctx;

      const blobUrl = URL.createObjectURL(
        new Blob([WORKLET_CODE], { type: "application/javascript" })
      );
      blobUrlRef.current = blobUrl;
      await ctx.audioWorklet.addModule(blobUrl);
      URL.revokeObjectURL(blobUrl);
      blobUrlRef.current = "";

      ws.onopen = () => {
        const name = masterName.trim() || "sir";
        ws.send(
          JSON.stringify({
            type: "session.update",
            session: {
              system_prompt: buildSystemPrompt(masterName),
              voice,
              greeting: `Grind OS online. Good ${timeOfDay()}, Master ${name}. Ready when you are.`,
              tools: VOICE_TOOLS,
              voice_activity_detection: {
                enabled: true,
                min_volume: 0.05,
                silence_after_speech_ms: 700,
              },
            },
          })
        );
      };

      ws.onmessage = async (evt) => {
        let msg: any;
        try {
          msg = JSON.parse(evt.data as string);
        } catch {
          return;
        }

        const t = msg.type as string;

        if (
          t === "session.started" ||
          t === "session.ready" ||
          t === "session.opened" ||
          t === "session.updated"
        ) {
          await startMic(ws, ctx);
        } else if (t === "turn.started" || t === "reply.started") {
          clearAudioQueue();
          onStatusChange("speaking");
        } else if (
          t === "reply.audio" ||
          t === "output_audio" ||
          t === "audio"
        ) {
          const audioData: string | undefined = msg.audio ?? msg.data;
          if (audioData) {
            queueAudio(audioData);
            onStatusChange("speaking");
          }
        } else if (
          t === "reply.done" ||
          t === "turn.ended" ||
          t === "reply.completed"
        ) {
          if ((msg.status as string | undefined) === "interrupted") {
            clearAudioQueue();
          }
          onStatusChange("listening");
        } else if (
          t === "transcript" ||
          t === "user_transcript" ||
          t === "partial_transcript"
        ) {
          const text: string = msg.text ?? msg.transcript ?? "";
          if (text) {
            onMessage({ id: uid(), role: "user", text, timestamp: new Date() });
          }
        } else if (
          t === "final_transcript" ||
          t === "user.transcript"
        ) {
          const text: string = msg.text ?? msg.transcript ?? "";
          if (text) {
            onMessage({ id: uid(), role: "user", text, timestamp: new Date() });
          }
        } else if (
          t === "agent_transcript" ||
          t === "reply.transcript" ||
          t === "reply.text" ||
          t === "agent.transcript"
        ) {
          const text: string = msg.text ?? msg.transcript ?? "";
          if (text) {
            onMessage({ id: uid(), role: "agent", text, timestamp: new Date() });
          }
        } else if (t === "thinking" || t === "response.thinking") {
          onStatusChange("thinking");
        } else if (t === "tool_call" || t === "tool.call") {
          const toolName: string = msg.name ?? msg.function_name ?? "";
          const rawArgs = msg.arguments ?? msg.input ?? {};
          const toolArgs =
            typeof rawArgs === "string" ? JSON.parse(rawArgs) : rawArgs;
          const callId: string = msg.tool_call_id ?? msg.call_id ?? uid();
          onStatusChange("thinking");
          const result = await executeTool(toolName, toolArgs);
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(
              JSON.stringify({
                type: "tool_result",
                tool_call_id: callId,
                result,
              })
            );
          }
        } else if (t === "error") {
          const errMsg: string = msg.message ?? msg.error ?? "Voice agent error";
          console.error("Voice agent error:", errMsg, msg);
          onError(errMsg);
          onStatusChange("error");
        }
      };

      ws.onerror = () => {
        onError(
          "Voice agent connection error. Please check your internet connection."
        );
        onStatusChange("idle");
      };

      ws.onclose = (e) => {
        if (e.code !== 1000 && e.code !== 1001) {
          console.warn("Voice agent WS closed unexpectedly:", e.code, e.reason);
        }
        onStatusChange("idle");
      };
    } catch (err: any) {
      console.error("Voice agent connect error:", err);
      optsRef.current.onError(
        err?.message ?? "Failed to start voice session"
      );
      optsRef.current.onStatusChange("idle");
    }
  }, [queueAudio, clearAudioQueue, executeTool, startMic]);

  const disconnect = useCallback(() => {
    optsRef.current.onStatusChange("stopping");

    workletRef.current?.disconnect();
    workletRef.current = null;
    gainRef.current?.disconnect();
    gainRef.current = null;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;

    if (wsRef.current?.readyState === WebSocket.OPEN) {
      try {
        wsRef.current.send(JSON.stringify({ type: "session.end" }));
      } catch {}
    }
    wsRef.current?.close(1000, "User ended session");
    wsRef.current = null;

    clearAudioQueue();
    audioCtxRef.current?.close().catch(() => {});
    audioCtxRef.current = null;

    if (blobUrlRef.current) {
      URL.revokeObjectURL(blobUrlRef.current);
      blobUrlRef.current = "";
    }

    optsRef.current.onStatusChange("idle");
  }, [clearAudioQueue]);

  useEffect(() => {
    return () => {
      disconnect();
    };
  }, []);

  return { connect, disconnect };
}
