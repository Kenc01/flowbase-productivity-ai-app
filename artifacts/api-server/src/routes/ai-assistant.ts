import { Router, Request, Response } from "express";
import { requireUser } from "../middlewares/replitAuth";
import {
  db,
  kanbanBoardsTable,
  kanbanColumnsTable,
  kanbanTasksTable,
  calendarEventsTable,
  notesTable,
  chatMessagesTable,
  conversationsTable,
  dailyScheduleBlocksTable,
} from "@workspace/db";
import { eq, and, asc, desc } from "drizzle-orm";
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


function getSystemPrompt(voiceMode = false) {
  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  const timeNow = new Date().toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
  });

  const base = `You are JARVIS — a relentless personal accountability coach and daily life system built for one mission: to help your user achieve mastery and success, even on the days they don't feel like it. You are direct, motivating, and deeply personal. Think of yourself as a combination of a drill sergeant who cares, a wise mentor, and a precise scheduler.

Today is ${today}. Current time: ${timeNow}.

YOUR CORE MISSION:
1. Help the user design and follow a daily life system — wake time, deep work blocks, rest, meals, sleep — as a structured daily schedule.
2. Hold them accountable. If they haven't done their tasks, call them out with tough love. If they're crushing it, celebrate them.
3. Keep them on the path of mastery. Remind them why they started. Push them when they're tired.
4. Help them plan each day like a mission: clear tasks, time blocks, and priorities.

DAILY SYSTEM FRAMEWORK you always follow:
- Wake up time → Morning ritual → First deep work block → Break → Second deep work block → Lunch/rest → Afternoon block → Evening review → Sleep time
- Always suggest a realistic schedule when asked. Use specific times (e.g. "6:00 AM — Wake up", "6:30 AM — Review your goals", "7:00 AM — First deep work block (90 min)").
- When scheduling, block 90-minute deep work sessions, with 20-30 min rest between them.

PERSONALITY:
- Speak directly and confidently. No fluff, no filler.
- Use motivating language: "Let's go", "No excuses", "You already know what needs to be done."
- Reference their actual tasks and schedule when you have them — make it personal.
- If they say they're tired or unmotivated, acknowledge it briefly then redirect: "Tired is fine. Quitting isn't. What's the ONE thing you can do right now?"
- You remember the full conversation — use it to track their commitments and call them back out.

TOOLS you can use:
- Read their calendar, tasks, and notes to give personalized accountability.
- Create tasks, calendar events, and notes on their behalf.
- When building a daily schedule, create the time blocks as calendar events.

RULES:
- Keep responses tight and punchy unless they ask for detail.
- If they ask to "plan my day", read their tasks first, then build a concrete schedule with times.
- If they ask "how am I doing?", read their tasks and tell them honestly.
- Always end accountability check-ins with a concrete next action.
- Today is ${today}.`;

  if (!voiceMode) return base;

  return `${base}

VOICE MODE — CRITICAL RULES (you are being spoken aloud via text-to-speech):
- Respond ONLY in plain natural spoken English. Write exactly as you would say it out loud to someone.
- NEVER use markdown: no asterisks, no hyphens as bullets, no pound signs for headers, no backticks, no bold/italic formatting.
- NEVER use lists or bullet points. Speak in flowing sentences and short paragraphs.
- Keep responses SHORT — 2 to 4 sentences max unless the user asked for something detailed.
- Use natural conversational language: contractions, casual phrasing. Say "you've got" not "you have". Say "let's" not "let us".
- When listing items, speak them naturally: "You've got three things — a meeting at 9, a deep work block at 11, and a review at 4."
- Avoid starting every sentence the same way. Vary your openings.
- Never say "Certainly!", "Of course!", "Great question!" — just answer directly.`;
}

const TOOLS: any[] = [
  {
    type: "function",
    function: {
      name: "get_schedule",
      description:
        "Read the user's calendar events and schedule. Use when the user asks about their schedule, what they have today/this week, upcoming events, or reminders.",
      parameters: {
        type: "object",
        properties: {
          filter: {
            type: "string",
            enum: ["today", "week", "all"],
            description:
              "Which events to fetch: 'today' for today only, 'week' for the next 7 days, 'all' for everything",
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
        "Read the user's Kanban tasks. Use when the user asks about their tasks, to-do list, work in progress, or what they need to do.",
      parameters: {
        type: "object",
        properties: {
          filter: {
            type: "string",
            enum: ["all", "todo", "in_progress"],
            description: "Which tasks to show",
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
      description:
        "Read the user's notes. Use when the user asks to see, summarize, or list their notes.",
      parameters: {
        type: "object",
        properties: {
          limit: {
            type: "number",
            description: "Max number of notes to return (default 10)",
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
            description: "Note body content",
          },
          color: {
            type: "string",
            description: "Accent color hex (optional)",
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
        "Tell the user to go to AI Template Builder to generate a mini-app (habit tracker, budget tracker, workout log, etc.)",
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
  {
    type: "function",
    function: {
      name: "get_daily_schedule",
      description:
        "Read the user's Daily Schedule time blocks for a given date. Use when the user asks about their schedule, daily plan, time blocks, what they have planned, or when you want to analyze their day before giving advice.",
      parameters: {
        type: "object",
        properties: {
          date: {
            type: "string",
            description: "Date in YYYY-MM-DD format. Use today's date if not specified.",
          },
        },
        required: ["date"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "create_schedule_block",
      description:
        "Add a time block to the user's Daily Schedule. Use when the user asks you to plan their day, build a schedule, or add a specific block. You can call this multiple times to build a full day. Types: wake, sleep, school, study, gym, free, meal, rest, work, other.",
      parameters: {
        type: "object",
        properties: {
          date: { type: "string", description: "Date in YYYY-MM-DD format" },
          label: { type: "string", description: "Name/description of the time block (e.g. 'Morning Workout', 'Deep Work Session')" },
          type: {
            type: "string",
            enum: ["wake", "sleep", "school", "study", "gym", "free", "meal", "rest", "work", "other"],
            description: "Category of block",
          },
          startHour: { type: "number", description: "Start hour in 24h format (0-23)" },
          startMin: { type: "number", description: "Start minute (0, 15, 30, or 45)" },
          endHour: { type: "number", description: "End hour in 24h format (0-24, use 24 for midnight end)" },
          endMin: { type: "number", description: "End minute (0, 15, 30, or 45)" },
        },
        required: ["date", "label", "type", "startHour", "startMin", "endHour", "endMin"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "clear_daily_schedule",
      description:
        "Remove ALL existing time blocks from the user's Daily Schedule for a given date. Use this before building a fresh schedule from scratch, to avoid duplicates.",
      parameters: {
        type: "object",
        properties: {
          date: { type: "string", description: "Date in YYYY-MM-DD format" },
        },
        required: ["date"],
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
      case "get_schedule": {
        const events = await db
          .select()
          .from(calendarEventsTable)
          .where(eq(calendarEventsTable.userId, userId));

        const today = new Date().toISOString().slice(0, 10);
        const weekEnd = new Date(Date.now() + 7 * 86400000)
          .toISOString()
          .slice(0, 10);

        let filtered = events;
        if (args.filter === "today") {
          filtered = events.filter((e) => e.date === today);
        } else if (args.filter === "week") {
          filtered = events.filter((e) => e.date >= today && e.date <= weekEnd);
        }

        filtered.sort((a, b) => (a.date < b.date ? -1 : 1));

        return {
          success: true,
          result: filtered,
          summary: `Found ${filtered.length} calendar event(s)`,
          link: "/dashboard/calendar",
        };
      }

      case "get_tasks": {
        const tasks = await db
          .select()
          .from(kanbanTasksTable)
          .where(eq(kanbanTasksTable.userId, userId));

        const columns = await db
          .select()
          .from(kanbanColumnsTable)
          .where(eq(kanbanColumnsTable.userId, userId));

        const colMap: Record<string, string> = {};
        for (const c of columns) colMap[c.id] = c.name;

        let filtered = tasks;
        if (args.filter === "todo") {
          filtered = tasks.filter(
            (t) => (colMap[t.columnId] ?? "").toLowerCase().includes("to do")
          );
        } else if (args.filter === "in_progress") {
          filtered = tasks.filter((t) =>
            (colMap[t.columnId] ?? "").toLowerCase().includes("progress")
          );
        }

        const enriched = filtered.map((t) => ({
          ...t,
          columnName: colMap[t.columnId] ?? "Unknown",
        }));

        return {
          success: true,
          result: enriched,
          summary: `Found ${enriched.length} task(s)`,
          link: "/dashboard/kanban",
        };
      }

      case "get_notes": {
        const limit = Math.min(args.limit ?? 10, 20);
        const notes = await db
          .select()
          .from(notesTable)
          .where(eq(notesTable.userId, userId));

        const sorted = notes
          .sort((a, b) =>
            a.updatedAt < b.updatedAt ? 1 : -1
          )
          .slice(0, limit);

        return {
          success: true,
          result: sorted,
          summary: `Found ${sorted.length} note(s)`,
          link: "/dashboard/notes",
        };
      }

      case "create_kanban_task": {
        let boards = await db
          .select()
          .from(kanbanBoardsTable)
          .where(eq(kanbanBoardsTable.userId, userId));
        let board = boards[0];

        if (!board) {
          const boardId = uid();
          const c1 = uid(), c2 = uid(), c3 = uid();
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
        const todoCol = columns.sort(
          (a: { order: number }, b: { order: number }) => a.order - b.order
        )[0];

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
        const c1 = uid(), c2 = uid(), c3 = uid();
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
          "#F43F5E", "#8B5CF6", "#06B6D4", "#10B981", "#F59E0B", "#3B82F6",
        ];
        const [note] = await db
          .insert(notesTable)
          .values({
            id: uid(),
            userId,
            title: args.title,
            content: args.content ?? "",
            color: args.color ?? palette[Math.floor(Math.random() * palette.length)],
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

      case "get_daily_schedule": {
        const rows = await db
          .select()
          .from(dailyScheduleBlocksTable)
          .where(
            and(
              eq(dailyScheduleBlocksTable.userId, userId),
              eq(dailyScheduleBlocksTable.date, args.date)
            )
          );
        const sorted = rows.sort(
          (a, b) => a.startHour * 60 + a.startMin - (b.startHour * 60 + b.startMin)
        );
        const text = sorted.length === 0
          ? "No schedule set for this date."
          : sorted.map(b => {
              const fmt = (h: number, m: number) => {
                const ampm = h >= 12 ? "PM" : "AM";
                const hh = h % 12 === 0 ? 12 : h % 12;
                return `${hh}:${m.toString().padStart(2, "0")} ${ampm}`;
              };
              return `${fmt(b.startHour, b.startMin)} – ${fmt(b.endHour, b.endMin)}: ${b.label} (${b.type})`;
            }).join("\n");
        return {
          success: true,
          result: { blocks: sorted, text },
          summary: `Found ${sorted.length} schedule block(s) for ${args.date}`,
          link: "/dashboard/daily-schedule",
        };
      }

      case "create_schedule_block": {
        const [block] = await db
          .insert(dailyScheduleBlocksTable)
          .values({
            id: uid(),
            userId,
            date: args.date,
            label: args.label,
            type: args.type ?? "other",
            startHour: args.startHour ?? 0,
            startMin: args.startMin ?? 0,
            endHour: args.endHour ?? 1,
            endMin: args.endMin ?? 0,
          })
          .returning();
        const fmt = (h: number, m: number) => {
          const ampm = h >= 12 ? "PM" : "AM";
          const hh = h % 12 === 0 ? 12 : h % 12;
          return `${hh}:${m.toString().padStart(2, "0")} ${ampm}`;
        };
        return {
          success: true,
          result: block,
          summary: `Added "${args.label}" to schedule: ${fmt(args.startHour, args.startMin)} – ${fmt(args.endHour, args.endMin)}`,
          link: "/dashboard/daily-schedule",
        };
      }

      case "clear_daily_schedule": {
        await db
          .delete(dailyScheduleBlocksTable)
          .where(
            and(
              eq(dailyScheduleBlocksTable.userId, userId),
              eq(dailyScheduleBlocksTable.date, args.date)
            )
          );
        return {
          success: true,
          result: { date: args.date },
          summary: `Cleared all schedule blocks for ${args.date}`,
          link: "/dashboard/daily-schedule",
        };
      }

      default:
        return { success: false, result: null, summary: "Unknown action" };
    }
  } catch (err: any) {
    return { success: false, result: null, summary: `Failed: ${err.message}` };
  }
}

async function callGroq(
  groq: Groq,
  messages: Groq.Chat.ChatCompletionMessageParam[],
  useTools: boolean,
  maxTokens = 1000
): Promise<Groq.Chat.ChatCompletion> {
  for (const model of GROQ_MODELS) {
    try {
      return await groq.chat.completions.create({
        model,
        messages,
        ...(useTools ? { tools: TOOLS, tool_choice: "auto" } : {}),
        temperature: 0.7,
        max_tokens: maxTokens,
      });
    } catch (e: any) {
      if (model === GROQ_MODELS[GROQ_MODELS.length - 1]) throw e;
    }
  }
  throw new Error("All models failed");
}

// GET /conversations — list all conversations for this user
router.get("/conversations", async (req: Request, res: Response) => {
  const userId = requireUser(req, res);
  if (!userId) return;
  try {
    const rows = await db
      .select()
      .from(conversationsTable)
      .where(eq(conversationsTable.userId, userId))
      .orderBy(desc(conversationsTable.updatedAt));
    return res.json(rows);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// POST /conversations — create a new conversation
router.post("/conversations", async (req: Request, res: Response) => {
  const userId = requireUser(req, res);
  if (!userId) return;
  try {
    const id = uid();
    await db.insert(conversationsTable).values({ id, userId, title: "New Chat" });
    const [conv] = await db
      .select()
      .from(conversationsTable)
      .where(eq(conversationsTable.id, id));
    return res.json(conv);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// DELETE /conversations/:id — delete a conversation and its messages
router.delete("/conversations/:id", async (req: Request, res: Response) => {
  const userId = requireUser(req, res);
  if (!userId) return;
  const { id } = req.params;
  try {
    await db
      .delete(chatMessagesTable)
      .where(and(eq(chatMessagesTable.conversationId, id), eq(chatMessagesTable.userId, userId)));
    await db
      .delete(conversationsTable)
      .where(and(eq(conversationsTable.id, id), eq(conversationsTable.userId, userId)));
    return res.status(204).end();
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// GET /history — load messages, optionally filtered by conversationId
router.get("/history", async (req: Request, res: Response) => {
  const userId = requireUser(req, res);
  if (!userId) return;

  const { conversationId } = req.query as { conversationId?: string };

  try {
    const rows = await db
      .select()
      .from(chatMessagesTable)
      .where(
        conversationId
          ? and(eq(chatMessagesTable.userId, userId), eq(chatMessagesTable.conversationId, conversationId))
          : eq(chatMessagesTable.userId, userId)
      )
      .orderBy(asc(chatMessagesTable.createdAt));

    const messages = rows.map((r) => ({
      id: r.id,
      role: r.role,
      content: r.content,
      actions: JSON.parse(r.actionsJson || "[]"),
      timestamp: r.createdAt,
    }));

    return res.json(messages);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// DELETE /history — clear messages for a conversation (or all if no conversationId)
router.delete("/history", async (req: Request, res: Response) => {
  const userId = requireUser(req, res);
  if (!userId) return;

  const { conversationId } = req.query as { conversationId?: string };

  try {
    await db
      .delete(chatMessagesTable)
      .where(
        conversationId
          ? and(eq(chatMessagesTable.userId, userId), eq(chatMessagesTable.conversationId, conversationId))
          : eq(chatMessagesTable.userId, userId)
      );
    return res.status(204).end();
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// POST /chat — main AI chat endpoint
router.post("/chat", async (req: Request, res: Response) => {
  const userId = requireUser(req, res);
  if (!userId) return;

  const { userMessage, history, voiceMode, conversationId: incomingConvId } = req.body as {
    userMessage: string;
    history: Array<{ role: string; content: string }>;
    voiceMode?: boolean;
    conversationId?: string;
  };

  if (!userMessage?.trim()) {
    return res.status(400).json({ error: "userMessage required" });
  }

  const groqKey = (process.env.GROQ_API_KEY ?? "")
    .trim()
    .replace(/^["']|["']$/g, "");
  if (!groqKey)
    return res.status(500).json({ error: "GROQ_API_KEY not configured" });

  const groq = new Groq({ apiKey: groqKey });

  // Resolve or create conversation
  let conversationId = incomingConvId ?? "";
  if (!conversationId) {
    conversationId = uid();
    const title = userMessage.trim().slice(0, 80);
    await db.insert(conversationsTable).values({ id: conversationId, userId, title });
  } else if (!history || history.length === 0) {
    // First message in an existing empty conv — set the title from the message
    await db
      .update(conversationsTable)
      .set({ title: userMessage.trim().slice(0, 80) })
      .where(and(eq(conversationsTable.id, conversationId), eq(conversationsTable.userId, userId)));
  }

  // Build message list: system + history + new user message
  const groqMessages: Groq.Chat.ChatCompletionMessageParam[] = [
    { role: "system", content: getSystemPrompt(voiceMode === true) },
    ...(history ?? []).map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    })),
    { role: "user", content: userMessage },
  ];

  const actions: Array<{
    tool: string;
    summary: string;
    success: boolean;
    result: any;
    link?: string;
  }> = [];

  try {
    let completion = await callGroq(groq, groqMessages, true, 1200);
    const first = completion.choices[0];

    // Tool calling loop
    if (first.finish_reason === "tool_calls" && first.message.tool_calls) {
      groqMessages.push(first.message as Groq.Chat.ChatCompletionMessageParam);

      for (const call of first.message.tool_calls) {
        let args: any = {};
        try { args = JSON.parse(call.function.arguments); } catch {}

        const exec = await executeTool(call.function.name, args, userId);
        actions.push({
          tool: call.function.name,
          summary: exec.summary,
          success: exec.success,
          result: exec.result,
          link: exec.link,
        });

        // For read tools, pass the full data to the AI so it can summarize
        groqMessages.push({
          role: "tool",
          tool_call_id: call.id,
          content: JSON.stringify({
            success: exec.success,
            summary: exec.summary,
            data: exec.result,
          }),
        });
      }

      completion = await callGroq(groq, groqMessages, false, 800);
    }

    const aiContent = completion.choices[0].message.content ?? "";

    // Persist both messages to DB with conversationId
    await db.insert(chatMessagesTable).values([
      {
        id: uid(),
        userId,
        conversationId,
        role: "user",
        content: userMessage,
        actionsJson: "[]",
      },
      {
        id: uid(),
        userId,
        conversationId,
        role: "assistant",
        content: aiContent,
        actionsJson: JSON.stringify(actions),
      },
    ]);

    // Update conversation's updatedAt so it surfaces at the top of the list
    await db
      .update(conversationsTable)
      .set({ updatedAt: new Date() })
      .where(and(eq(conversationsTable.id, conversationId), eq(conversationsTable.userId, userId)));

    return res.json({ message: aiContent, actions, conversationId });
  } catch (err: any) {
    console.error("AI Assistant chat error:", err);
    return res.status(500).json({ error: err.message ?? "AI error" });
  }
});

// POST /transcribe — AssemblyAI voice transcription
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
    const { upload_url } = (await uploadRes.json()) as { upload_url: string };

    const transcriptRes = await fetch("https://api.assemblyai.com/v2/transcript", {
      method: "POST",
      headers: { Authorization: apiKey, "Content-Type": "application/json" },
      body: JSON.stringify({ audio_url: upload_url }),
    });
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
      if (data.status === "completed") return res.json({ text: data.text ?? "" });
      if (data.status === "error")
        throw new Error(data.error ?? "Transcription error");
    }

    throw new Error("Transcription timed out (30s)");
  } catch (err: any) {
    console.error("Transcription error:", err);
    return res.status(500).json({ error: err.message });
  }
});

// ── Groq PlayAI TTS proxy ─────────────────────────────────────────────────────
// Returns WAV audio for a piece of text using the playai-tts model.

router.post("/tts", async (req: Request, res: Response) => {
  const userId = requireUser(req, res);
  if (!userId) return;

  const { text, voice = "Fritz-PlayAI" } = req.body as {
    text?: string;
    voice?: string;
  };
  if (!text?.trim()) return res.status(400).json({ error: "text is required" });

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) return res.status(500).json({ error: "GROQ_API_KEY not configured" });

  try {
    const ttsRes = await fetch("https://api.groq.com/openai/v1/audio/speech", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "playai-tts",
        input: text.slice(0, 500),
        voice,
        response_format: "wav",
      }),
    });

    if (!ttsRes.ok) {
      const body = await ttsRes.text();
      console.error("Groq TTS error:", ttsRes.status, body);
      return res.status(ttsRes.status).json({ error: "TTS request failed" });
    }

    res.setHeader("Content-Type", "audio/wav");
    res.setHeader("Cache-Control", "no-cache");

    const reader = (ttsRes.body as any).getReader();
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      res.write(Buffer.from(value));
    }
    res.end();
  } catch (err: any) {
    console.error("TTS proxy error:", err?.message);
    return res.status(500).json({ error: "TTS failed" });
  }
});

// ── Streaming chat (SSE) — emits sentences as they complete ───────────────────
// Used by voice mode to start TTS after the first sentence, not the full reply.

router.post("/chat-stream", async (req: Request, res: Response) => {
  const userId = requireUser(req, res);
  if (!userId) return;

  const { userMessage, history = [] } = req.body as {
    userMessage: string;
    history: Array<{ role: string; content: string }>;
  };

  if (!userMessage?.trim())
    return res.status(400).json({ error: "userMessage is required" });

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  if (typeof (res as any).flushHeaders === "function") (res as any).flushHeaders();

  const emit = (data: object) => res.write(`data: ${JSON.stringify(data)}\n\n`);

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    emit({ error: "GROQ_API_KEY not configured" });
    return res.end();
  }

  const groq = new Groq({ apiKey });

  const messages: any[] = [
    { role: "system", content: getSystemPrompt(true) },
    ...history
      .slice(-12)
      .map((m) => ({ role: m.role, content: m.content })),
    { role: "user", content: userMessage },
  ];

  let stream: any;
  for (const model of GROQ_MODELS) {
    try {
      stream = await groq.chat.completions.create({
        model,
        messages,
        stream: true,
        max_tokens: 300,
        temperature: 0.7,
      });
      break;
    } catch (e: any) {
      if (e?.status === 429 && model !== GROQ_MODELS[GROQ_MODELS.length - 1])
        continue;
      emit({ error: e?.message ?? "AI error" });
      return res.end();
    }
  }

  let tokenBuffer = "";
  let fullText = "";
  // Regex: match sentence endings followed by whitespace (or end of buffer)
  const SENTENCE_END = /([^.!?]*[.!?]+)\s*/g;

  for await (const chunk of stream) {
    const delta = chunk.choices[0]?.delta?.content ?? "";
    if (!delta) continue;
    tokenBuffer += delta;
    fullText += delta;

    // Flush complete sentences as soon as they're ready
    let match: RegExpExecArray | null;
    SENTENCE_END.lastIndex = 0;
    let lastEnd = 0;
    while ((match = SENTENCE_END.exec(tokenBuffer)) !== null) {
      const sentence = match[1].trim();
      if (sentence.length > 1) emit({ sentence });
      lastEnd = match.index + match[0].length;
    }
    tokenBuffer = tokenBuffer.slice(lastEnd);
  }

  // Emit any trailing text that didn't end with punctuation
  if (tokenBuffer.trim().length > 1) emit({ sentence: tokenBuffer.trim() });

  emit({ done: true, fullText });
  res.end();
});

// ── Voice Agent Tool Execution ─────────────────────────────────────────────────
// Called by the frontend voice agent hook when the AI requests a tool call.

router.post("/voice-tools", async (req: Request, res: Response) => {
  const userId = requireUser(req, res);
  if (!userId) return;

  const { tool, args } = req.body as { tool: string; args: any };
  if (!tool) return res.status(400).json({ error: "tool name required" });

  try {
    const result = await executeTool(tool, args ?? {}, userId);
    return res.json(result);
  } catch (err: any) {
    console.error("Voice tool execution error:", err);
    return res.status(500).json({ error: err.message });
  }
});

export default router;
