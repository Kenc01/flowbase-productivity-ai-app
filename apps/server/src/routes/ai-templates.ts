import { Router } from "express";
import { getAuth } from "@clerk/express";
import { db, aiTemplatesTable, aiSidebarAppsTable } from "@flowbase/db";
import { eq, and, desc } from "drizzle-orm";
import Groq from "groq-sdk";

const router = Router();

const SIDEBAR_LIMIT = 3;

const GROQ_MODELS = [
  "llama-3.3-70b-versatile",
  "llama-3.1-70b-versatile",
  "llama-3.1-8b-instant",
];

function requireUser(req: any, res: any): string | null {
  const auth = getAuth(req);
  const userId = auth?.userId;
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return null;
  }
  return userId;
}

function uid() {
  return (
    Math.random().toString(36).slice(2, 10) +
    Math.random().toString(36).slice(2, 10)
  );
}

const GENERATE_SYSTEM_PROMPT = `You are an AI mini-app designer. Given a user prompt, output ONLY valid JSON describing a single-page mini app layout. No prose, no markdown, no explanation — just the raw JSON object.

Output format:
{
  "appName": "string (short, 2-4 words, e.g. 'Habit Tracker')",
  "description": "string (one sentence describing the app)",
  "icon": "string (one Lucide icon name: Flame, Target, BookOpen, Apple, DollarSign, Brain, Dumbbell, ShoppingCart, Heart, Coffee, Music, Plane, Star, Zap, Clock, etc.)",
  "color": "string (a vivid hex color that fits the theme, e.g. '#10B981' for health, '#F59E0B' for finance, '#6366F1' for study)",
  "layout": "single-page",
  "sections": [
    {
      "id": "s1",
      "type": "stats|checklist|list|table|form|progress|tags|chart_placeholder",
      "title": "string",
      "items": []
    }
  ],
  "actions": [
    { "label": "string", "icon": "string (Lucide icon name)", "variant": "primary|secondary|ghost" }
  ],
  "sampleData": [{ "key": "value" }]
}

Section type item schemas (use realistic, specific data — not generic placeholders):
- "stats": items = [{ "label": "string", "value": "string (number or text)", "icon": "string (Lucide name)", "change": "string (e.g. +12% this week)" }] — include 3-4 stat cards
- "checklist": items = [{ "id": "c1", "label": "string (specific task)", "done": false, "streak": "🔥 5 days (optional)" }] — include 4-6 realistic items, some done:true
- "list": items = [{ "id": "l1", "label": "string", "sublabel": "string (detail)", "tag": "string (status/category)", "tagColor": "#hex" }] — include 3-5 items with varied tags
- "table": items = [{ "columns": ["Name","Amount","Date","Status"], "rows": [["Item A","$50","Jan 1","Paid"],["Item B","$30","Jan 3","Pending"]] }]
- "form": items = [{ "label": "string", "type": "text|number|select|date|textarea", "placeholder": "string", "options": ["opt1","opt2"] }] — 3-5 fields
- "progress": items = [{ "label": "string", "value": number (0-100), "color": "#hex (optional)" }] — 3-5 bars with varied values
- "tags": items = [{ "label": "string (category/tag name)", "color": "#hex" }] — 5-8 colorful tags
- "chart_placeholder": items = [{ "chartType": "bar|line|pie|donut", "label": "string (what the chart shows)" }]

App-type guidance (pick the right sections):
- Habit/routine tracker → stats + checklist + progress + chart_placeholder
- Budget/expense tracker → stats + table + chart_placeholder + form
- Meal/food planner → list + form + tags + progress
- Study/learning planner → checklist + progress + stats + chart_placeholder
- Workout/fitness → checklist + stats + progress + chart_placeholder
- Reading/book list → list + progress + tags + stats
- Travel planner → list + checklist + form + table
- Project manager → checklist + stats + table + tags
- Shopping list → checklist + list + stats
- Journal/diary → form + list + tags

Rules:
- Always produce 3-5 sections (never fewer than 2)
- Always include 1-3 action buttons (primary for the main action)
- All items must have realistic, domain-specific sample data — never use "Item 1", "Value 1", etc.
- Section ids must be unique strings (s1, s2, s3...)
- Checklist item ids: c1, c2... List item ids: l1, l2...
- Output ONLY the JSON object, starting with { and ending with }. No other text.`;

// POST /api/ai-templates/generate
router.post("/generate", async (req, res) => {
  const userId = requireUser(req, res);
  if (!userId) return;

  const { prompt } = req.body as { prompt: string };
  if (!prompt?.trim())
    return res.status(400).json({ error: "Prompt is required" });

  const groqKey = (process.env.GROQ_API_KEY ?? "")
    .trim()
    .replace(/^["']|["']$/g, "");
  if (!groqKey)
    return res.status(500).json({ error: "GROQ_API_KEY not configured" });

  try {
    const groq = new Groq({ apiKey: groqKey });
    let raw = "";

    for (const model of GROQ_MODELS) {
      try {
        const completion = await groq.chat.completions.create({
          model,
          messages: [
            { role: "system", content: GENERATE_SYSTEM_PROMPT },
            { role: "user", content: `Create a mini app for: ${prompt}` },
          ],
          temperature: 0.6,
          max_tokens: 3000,
        });
        raw = completion.choices[0]?.message?.content?.trim() ?? "";
        if (raw) break;
      } catch (e: any) {
        if (
          !e?.message?.includes("rate_limit") &&
          !e?.message?.includes("model_not_available")
        )
          throw e;
      }
    }

    // Strip markdown code fences if present
    raw = raw
      .replace(/^```json\s*/i, "")
      .replace(/^```\s*/i, "")
      .replace(/\s*```$/i, "")
      .trim();

    // Extract the outermost JSON object even if there's extra text around it
    const firstBrace = raw.indexOf("{");
    const lastBrace = raw.lastIndexOf("}");
    if (firstBrace !== -1 && lastBrace > firstBrace) {
      raw = raw.slice(firstBrace, lastBrace + 1);
    }

    let parsed: any;
    try {
      parsed = JSON.parse(raw);
    } catch {
      return res.status(500).json({
        error:
          "AI returned invalid JSON. Please try again with a different prompt.",
      });
    }

    if (
      !parsed.appName ||
      !Array.isArray(parsed.sections) ||
      parsed.sections.length === 0
    ) {
      return res
        .status(500)
        .json({ error: "AI returned incomplete data. Please try again." });
    }

    // Normalise sections — ensure every section has an id and items array
    parsed.sections = parsed.sections.map((s: any, i: number) => ({
      id: s.id ?? `s${i + 1}`,
      type: s.type ?? "list",
      title: s.title ?? "Section",
      items: Array.isArray(s.items) ? s.items : [],
    }));

    // Normalise actions
    if (!Array.isArray(parsed.actions)) parsed.actions = [];
    if (parsed.actions.length === 0) {
      parsed.actions = [
        { label: "Get Started", icon: "Sparkles", variant: "primary" },
      ];
    }

    return res.json(parsed);
  } catch (err: any) {
    console.error("AI template generate error:", err?.message ?? err);
    return res.status(500).json({ error: err?.message ?? "Generation failed" });
  }
});

// GET /api/ai-templates/sidebar/apps — must be before /:id
router.get("/sidebar/apps", async (req, res) => {
  const userId = requireUser(req, res);
  if (!userId) return;
  const sidebarApps = await db
    .select({
      sidebarId: aiSidebarAppsTable.id,
      templateId: aiSidebarAppsTable.templateId,
      sortOrder: aiSidebarAppsTable.sortOrder,
      appName: aiTemplatesTable.appName,
      icon: aiTemplatesTable.icon,
      color: aiTemplatesTable.color,
      description: aiTemplatesTable.description,
    })
    .from(aiSidebarAppsTable)
    .innerJoin(
      aiTemplatesTable,
      eq(aiSidebarAppsTable.templateId, aiTemplatesTable.id),
    )
    .where(eq(aiSidebarAppsTable.userId, userId));
  return res.json(sidebarApps);
});

// POST /api/ai-templates/sidebar/apps — add to sidebar
router.post("/sidebar/apps", async (req, res) => {
  const userId = requireUser(req, res);
  if (!userId) return;

  const { templateId } = req.body as { templateId: string };
  if (!templateId)
    return res.status(400).json({ error: "templateId is required" });

  const existing = await db
    .select()
    .from(aiSidebarAppsTable)
    .where(eq(aiSidebarAppsTable.userId, userId));
  if (existing.length >= SIDEBAR_LIMIT) {
    return res.status(400).json({
      error: `Maximum ${SIDEBAR_LIMIT} apps can be added to the sidebar.`,
    });
  }
  if (existing.some((a) => a.templateId === templateId)) {
    return res.status(400).json({ error: "App is already in the sidebar." });
  }

  const [app] = await db
    .insert(aiSidebarAppsTable)
    .values({
      id: uid(),
      userId,
      templateId,
      sortOrder: existing.length,
    })
    .returning();

  // Return full joined data matching GET /sidebar/apps shape
  const [fullApp] = await db
    .select({
      sidebarId: aiSidebarAppsTable.id,
      templateId: aiSidebarAppsTable.templateId,
      sortOrder: aiSidebarAppsTable.sortOrder,
      appName: aiTemplatesTable.appName,
      icon: aiTemplatesTable.icon,
      color: aiTemplatesTable.color,
      description: aiTemplatesTable.description,
    })
    .from(aiSidebarAppsTable)
    .innerJoin(
      aiTemplatesTable,
      eq(aiSidebarAppsTable.templateId, aiTemplatesTable.id),
    )
    .where(eq(aiSidebarAppsTable.id, app.id));

  return res.status(201).json(fullApp);
});

// DELETE /api/ai-templates/sidebar/apps/:templateId — remove from sidebar
router.delete("/sidebar/apps/:templateId", async (req, res) => {
  const userId = requireUser(req, res);
  if (!userId) return;
  await db
    .delete(aiSidebarAppsTable)
    .where(
      and(
        eq(aiSidebarAppsTable.templateId, req.params.templateId),
        eq(aiSidebarAppsTable.userId, userId),
      ),
    );
  return res.status(204).end();
});

// GET /api/ai-templates — list user's templates (newest first)
router.get("/", async (req, res) => {
  const userId = requireUser(req, res);
  if (!userId) return;
  const templates = await db
    .select()
    .from(aiTemplatesTable)
    .where(eq(aiTemplatesTable.userId, userId))
    .orderBy(desc(aiTemplatesTable.createdAt));
  return res.json(templates);
});

// POST /api/ai-templates — save a generated template
router.post("/", async (req, res) => {
  const userId = requireUser(req, res);
  if (!userId) return;
  const {
    appName,
    description,
    icon,
    color,
    layout,
    sectionsJson,
    actionsJson,
    sampleDataJson,
    prompt,
  } = req.body;
  const [template] = await db
    .insert(aiTemplatesTable)
    .values({
      id: uid(),
      userId,
      appName: appName ?? "Untitled App",
      description: description ?? "",
      icon: icon ?? "Wand2",
      color: color ?? "#7467F0",
      layout: layout ?? "single-page",
      sectionsJson: sectionsJson ?? "[]",
      actionsJson: actionsJson ?? "[]",
      sampleDataJson: sampleDataJson ?? "[]",
      prompt: prompt ?? "",
    })
    .returning();
  return res.status(201).json(template);
});

// GET /api/ai-templates/:id — get a single template
router.get("/:id", async (req, res) => {
  const userId = requireUser(req, res);
  if (!userId) return;
  const [template] = await db
    .select()
    .from(aiTemplatesTable)
    .where(
      and(
        eq(aiTemplatesTable.id, req.params.id),
        eq(aiTemplatesTable.userId, userId),
      ),
    );
  if (!template) return res.status(404).json({ error: "Not found" });
  return res.json(template);
});

// DELETE /api/ai-templates/:id — delete a template
router.delete("/:id", async (req, res) => {
  const userId = requireUser(req, res);
  if (!userId) return;
  await db
    .delete(aiSidebarAppsTable)
    .where(
      and(
        eq(aiSidebarAppsTable.templateId, req.params.id),
        eq(aiSidebarAppsTable.userId, userId),
      ),
    );
  await db
    .delete(aiTemplatesTable)
    .where(
      and(
        eq(aiTemplatesTable.id, req.params.id),
        eq(aiTemplatesTable.userId, userId),
      ),
    );
  return res.status(204).end();
});

export default router;
