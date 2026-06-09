import { Router, Request, Response } from "express";
import { getAuth } from "@clerk/express";
import {
  db,
  kanbanBoardsTable,
  kanbanColumnsTable,
  kanbanTasksTable,
  calendarEventsTable,
  notesTable,
} from "@workspace/db";
import { eq, and } from "drizzle-orm";
import Groq from "groq-sdk";

const router = Router();

const GROQ_MODELS = [
  "llama-3.3-70b-versatile",
  "llama-3.1-70b-versatile",
  "llama-3.1-8b-instant",
];

function uid() {
  return (
    Math.random().toString(36).slice(2, 10) +
    Math.random().toString(36).slice(2, 10)
  );
}

function requireUser(req: any, res: any): string | null {
  const auth = getAuth(req);
  const userId = auth?.userId;
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return null;
  }
  return userId;
}

function getSystemPrompt() {
  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  return `You are FlowBase AI — a smart, friendly productivity assistant built into the FlowBase workspace app. You help users manage their tasks, notes, calendar, and ideas.

You have access to tools that let you take real actions inside the app:
- Create Kanban tasks and boards
- Add events and reminders to the calendar
- Create notes
- Generate AI mini-app templates

Guidelines:
- Be concise, warm, and helpful. Keep responses short unless detail is asked for.
- When a user asks you to do something (add task, create note, set reminder), use the appropriate tool — don't just describe what to do.
- If the request is ambiguous (e.g., "add meeting" with no date), ask ONE focused follow-up question.
- After completing an action, briefly confirm what you did.
- For general questions, answer directly without using tools.
- Today is ${today}.`;
}

const TOOLS: any[] = [
  {
    type: "function",
    function: {
      name: "create_kanban_task",
      description:
        "Create a new task card on the user's Kanban board. If no board exists, one is created automatically.",
      parameters: {
        type: "object",
        properties: {
          title: { type: "string", description: "Short task title" },
          description: {
            type: "string",
            description: "Optional longer description",
          },
          priority: {
            type: "string",
            enum: ["low", "medium", "high"],
            description: "Task priority level",
          },
          dueDate: {
            type: "string",
            description: "Due date in YYYY-MM-DD format (optional)",
          },
        },
        required: ["title"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "create_kanban_board",
      description:
        "Create a brand-new Kanban board with To Do, In Progress, and Done columns",
      parameters: {
        type: "object",
        properties: {
          name: { type: "string", description: "Board name" },
          color: {
            type: "string",
            description: "Accent color hex (e.g. #7467F0)",
          },
        },
        required: ["name"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "create_calendar_event",
      description:
        "Add a task, event, or reminder to the user's calendar on a specific date",
      parameters: {
        type: "object",
        properties: {
          title: { type: "string", description: "Event/reminder title" },
          date: {
            type: "string",
            description: "Date in YYYY-MM-DD format — required",
          },
          type: {
            type: "string",
            enum: ["task", "event", "reminder"],
            description: "Kind of calendar entry",
          },
          category: {
            type: "string",
            enum: ["work", "personal", "health", "finance", "other"],
            description: "Category",
          },
          notes: {
            type: "string",
            description: "Optional extra notes or description",
          },
        },
        required: ["title", "date"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "create_note",
      description: "Create a new note in the Notes section",
      parameters: {
        type: "object",
        properties: {
          title: { type: "string", description: "Note title" },
          content: {
            type: "string",
            description: "Note body content (plain text or markdown-ish)",
          },
          color: {
            type: "string",
            description:
              "Accent color hex matching the note's theme (optional)",
          },
        },
        required: ["title"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "generate_ai_template",
      description:
        "Tell the user to go to AI Template Builder to generate a mini-app. Use this when they ask to generate a habit tracker, budget tracker, workout log, or any mini-app.",
      parameters: {
        type: "object",
        properties: {
          prompt: {
            type: "string",
            description: "The mini-app description to suggest",
          },
        },
        required: ["prompt"],
      },
    },
  },
];

async function executeTool(
  name: string,
  args: any,
  userId: string
): Promise<{ success: boolean; result: any; summary: string; link?: string }> {
  try {
    switch (name) {
      case "create_kanban_task": {
        let boards = await db
          .select()
          .from(kanbanBoardsTable)
          .where(eq(kanbanBoardsTable.userId, userId));
        let board = boards[0];

        if (!board) {
          const boardId = uid();
          const c1 = uid(),
            c2 = uid(),
            c3 = uid();
          [board] = await db
            .insert(kanbanBoardsTable)
            .values({
              id: boardId,
              userId,
              name: "My Board",
              color: "#7467F0",
              columnOrder: [c1, c2, c3],
            })
            .returning();
          await db.insert(kanbanColumnsTable).values([
            { id: c1, boardId, userId, name: "To Do", order: 0 },
            { id: c2, boardId, userId, name: "In Progress", order: 1 },
            { id: c3, boardId, userId, name: "Done", order: 2 },
          ]);
        }

        const columns = await db
          .select()
          .from(kanbanColumnsTable)
          .where(
            and(
              eq(kanbanColumnsTable.boardId, board.id),
              eq(kanbanColumnsTable.userId, userId)
            )
          );
        const todoCol = columns.sort((a: { order: number }, b: { order: number }) => a.order - b.order)[0];

        const [task] = await db
          .insert(kanbanTasksTable)
          .values({
            id: uid(),
            boardId: board.id,
            columnId: todoCol.id,
            userId,
            title: args.title,
            description: args.description ?? "",
            priority: args.priority ?? "medium",
            dueDate: args.dueDate ?? "",
          })
          .returning();

        return {
          success: true,
          result: task,
          summary: `Created task "${args.title}" in "${board.name}"`,
          link: "/dashboard/kanban",
        };
      }

      case "create_kanban_board": {
        const boardId = uid();
        const c1 = uid(),
          c2 = uid(),
          c3 = uid();
        const [board] = await db
          .insert(kanbanBoardsTable)
          .values({
            id: boardId,
            userId,
            name: args.name,
            color: args.color ?? "#7467F0",
            columnOrder: [c1, c2, c3],
          })
          .returning();
        await db.insert(kanbanColumnsTable).values([
          { id: c1, boardId, userId, name: "To Do", order: 0 },
          { id: c2, boardId, userId, name: "In Progress", order: 1 },
          { id: c3, boardId, userId, name: "Done", order: 2 },
        ]);
        return {
          success: true,
          result: board,
          summary: `Created Kanban board "${args.name}"`,
          link: "/dashboard/kanban",
        };
      }

      case "create_calendar_event": {
        const [event] = await db
          .insert(calendarEventsTable)
          .values({
            id: uid(),
            userId,
            title: args.title,
            date: args.date,
            type: args.type ?? "task",
            category: args.category ?? "work",
            notes: args.notes ?? "",
            isDraft: false,
          })
          .returning();
        return {
          success: true,
          result: event,
          summary: `Added "${args.title}" to calendar on ${args.date}`,
          link: "/dashboard/calendar",
        };
      }

      case "create_note": {
        const palette = [
          "#F43F5E",
          "#8B5CF6",
          "#06B6D4",
          "#10B981",
          "#F59E0B",
          "#3B82F6",
        ];
        const [note] = await db
          .insert(notesTable)
          .values({
            id: uid(),
            userId,
            title: args.title,
            content: args.content ?? "",
            color:
              args.color ?? palette[Math.floor(Math.random() * palette.length)],
            symbol: "📝",
            pinned: false,
          })
          .returning();
        return {
          success: true,
          result: note,
          summary: `Created note "${args.title}"`,
          link: "/dashboard/notes",
        };
      }

      case "generate_ai_template": {
        return {
          success: true,
          result: { prompt: args.prompt },
          summary: `Open AI Template Builder to generate: "${args.prompt}"`,
          link: "/dashboard/templates",
        };
      }

      default:
        return { success: false, result: null, summary: "Unknown action" };
    }
  } catch (err: any) {
    return { success: false, result: null, summary: `Failed: ${err.message}` };
  }
}

router.post("/chat", async (req: Request, res: Response) => {
  const userId = requireUser(req, res);
  if (!userId) return;

  const { messages } = req.body as {
    messages: Array<{ role: string; content: string }>;
  };
  if (!Array.isArray(messages) || !messages.length) {
    return res.status(400).json({ error: "messages array required" });
  }

  const groqKey = (process.env.GROQ_API_KEY ?? "")
    .trim()
    .replace(/^["']|["']$/g, "");
  if (!groqKey)
    return res.status(500).json({ error: "GROQ_API_KEY not configured" });

  const groq = new Groq({ apiKey: groqKey });

  let groqMessages: Groq.Chat.ChatCompletionMessageParam[] = [
    { role: "system", content: getSystemPrompt() },
    ...messages.map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    })),
  ];

  const actions: Array<{
    tool: string;
    summary: string;
    success: boolean;
    result: any;
    link?: string;
  }> = [];

  try {
    let completion: Groq.Chat.ChatCompletion | null = null;
    for (const model of GROQ_MODELS) {
      try {
        completion = await groq.chat.completions.create({
          model,
          messages: groqMessages,
          tools: TOOLS,
          tool_choice: "auto",
          temperature: 0.7,
          max_tokens: 1000,
        });
        break;
      } catch (e: any) {
        if (model === GROQ_MODELS[GROQ_MODELS.length - 1]) throw e;
      }
    }

    const first = completion!.choices[0];

    if (first.finish_reason === "tool_calls" && first.message.tool_calls) {
      groqMessages.push(
        first.message as Groq.Chat.ChatCompletionMessageParam
      );

      for (const call of first.message.tool_calls) {
        let args: any = {};
        try {
          args = JSON.parse(call.function.arguments);
        } catch {}
        const exec = await executeTool(call.function.name, args, userId);
        actions.push({
          tool: call.function.name,
          summary: exec.summary,
          success: exec.success,
          result: exec.result,
          link: exec.link,
        });
        groqMessages.push({
          role: "tool",
          tool_call_id: call.id,
          content: JSON.stringify({
            success: exec.success,
            summary: exec.summary,
          }),
        });
      }

      let finalCompletion: Groq.Chat.ChatCompletion | null = null;
      for (const model of GROQ_MODELS) {
        try {
          finalCompletion = await groq.chat.completions.create({
            model,
            messages: groqMessages,
            temperature: 0.7,
            max_tokens: 600,
          });
          break;
        } catch (e: any) {
          if (model === GROQ_MODELS[GROQ_MODELS.length - 1]) throw e;
        }
      }

      return res.json({
        message: finalCompletion!.choices[0].message.content,
        actions,
      });
    }

    return res.json({ message: first.message.content, actions: [] });
  } catch (err: any) {
    console.error("AI Assistant chat error:", err);
    return res.status(500).json({ error: err.message ?? "AI error" });
  }
});

router.post("/transcribe", async (req: Request, res: Response) => {
  const userId = requireUser(req, res);
  if (!userId) return;

  const { audio } = req.body as { audio: string };
  if (!audio) return res.status(400).json({ error: "audio (base64) required" });

  const apiKey = process.env.ASSEMBLYAI_API_KEY;
  if (!apiKey || apiKey === "your_assemblyai_api_key_here") {
    return res.status(500).json({ error: "ASSEMBLYAI_API_KEY not configured" });
  }

  try {
    const audioBuffer = Buffer.from(audio, "base64");

    const uploadRes = await fetch("https://api.assemblyai.com/v2/upload", {
      method: "POST",
      headers: {
        Authorization: apiKey,
        "Content-Type": "application/octet-stream",
      },
      body: audioBuffer as any,
    });
    if (!uploadRes.ok)
      throw new Error(`Upload failed: ${uploadRes.statusText}`);
    const { upload_url } = (await uploadRes.json()) as {
      upload_url: string;
    };

    const transcriptRes = await fetch(
      "https://api.assemblyai.com/v2/transcript",
      {
        method: "POST",
        headers: {
          Authorization: apiKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ audio_url: upload_url }),
      }
    );
    if (!transcriptRes.ok)
      throw new Error(`Transcript request failed: ${transcriptRes.statusText}`);
    const { id } = (await transcriptRes.json()) as { id: string };

    const start = Date.now();
    while (Date.now() - start < 30000) {
      await new Promise((r) => setTimeout(r, 1500));
      const pollRes = await fetch(
        `https://api.assemblyai.com/v2/transcript/${id}`,
        { headers: { Authorization: apiKey } }
      );
      const data = (await pollRes.json()) as {
        status: string;
        text?: string;
        error?: string;
      };
      if (data.status === "completed")
        return res.json({ text: data.text ?? "" });
      if (data.status === "error")
        throw new Error(data.error ?? "Transcription error");
    }

    throw new Error("Transcription timed out (30s)");
  } catch (err: any) {
    console.error("Transcription error:", err);
    return res.status(500).json({ error: err.message });
  }
});

export default router;
