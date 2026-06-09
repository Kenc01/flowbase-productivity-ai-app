import { Router } from "express";
import { getAuth } from "@clerk/express";
import { db, aiTemplatesTable, aiSidebarAppsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import Groq from "groq-sdk";

const router = Router();

const SIDEBAR_LIMIT = 3;

const GROQ_MODELS = [
  "llama-3.3-70b-versatile",
  "llama-3.1-8b-instant",
];

function requireUser(req: any, res: any): string | null {
  const auth = getAuth(req);
  const userId = auth?.userId;
  if (!userId) { res.status(401).json({ error: "Unauthorized" }); return null; }
  return userId;
}

function uid() {
  return Math.random().toString(36).slice(2, 10) + Math.random().toString(36).slice(2, 10);
}

const GENERATE_SYSTEM_PROMPT = `You are an AI mini-app designer. Given a user prompt, output ONLY valid JSON describing a single-page mini app layout.

Output format (strict JSON, no markdown, no explanation):
{
  "appName": "string (short, 2-4 words)",
  "description": "string (one sentence)",
  "icon": "string (Lucide icon name like Flame, Target, BookOpen, Apple, DollarSign, Brain, Dumbbell, etc.)",
  "color": "string (hex color, pick a fitting one)",
  "layout": "single-page",
  "sections": [
    {
      "id": "unique_id",
      "type": "stats|checklist|list|table|form|progress|tags|chart_placeholder",
      "title": "string",
      "items": [] // see below for each type
    }
  ],
  "actions": [
    { "label": "string", "icon": "string (Lucide icon name)", "variant": "primary|secondary|ghost" }
  ],
  "sampleData": [
    { "key": "value" }
  ]
}

Section type schemas:
- "stats": items = [{ "label": "string", "value": "string", "icon": "string", "change": "string (optional, e.g. +12%)" }]
- "checklist": items = [{ "id": "string", "label": "string", "done": boolean, "streak": "string (optional)" }]
- "list": items = [{ "id": "string", "label": "string", "sublabel": "string (optional)", "tag": "string (optional)", "tagColor": "string hex (optional)" }]
- "table": items = [{ "columns": ["col1","col2"], "rows": [["val1","val2"]] }] (put the whole table spec as one item)
- "form": items = [{ "label": "string", "type": "text|number|select|date|textarea", "placeholder": "string", "options": ["opt1"] (for select) }]
- "progress": items = [{ "label": "string", "value": number (0-100), "color": "string hex (optional)" }]
- "tags": items = [{ "label": "string", "color": "string hex" }]
- "chart_placeholder": items = [{ "chartType": "bar|line|pie|donut", "label": "string" }]

Rules:
- Include 2-5 meaningful sections that make sense for the app type
- For a Habit Tracker: use stats, checklist, progress sections
- For a Budget Tracker: use stats, table, chart_placeholder sections
- For a Meal Planner: use list, form, tags sections
- For a Study Planner: use checklist, progress, stats sections
- Always include at least 1 action button
- sampleData should have 3-5 realistic example entries
- Make it feel complete and useful
- Output ONLY valid JSON, nothing else`;

// POST /api/ai-templates/generate
router.post("/generate", async (req, res) => {
  const userId = requireUser(req, res);
  if (!userId) return;

  const { prompt } = req.body as { prompt: string };
  if (!prompt?.trim()) return res.status(400).json({ error: "Prompt is required" });

  const groqKey = (process.env.GROQ_API_KEY ?? "").trim().replace(/^["']|["']$/g, "");
  if (!groqKey) return res.status(500).json({ error: "GROQ_API_KEY not configured" });

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
        if (!e?.message?.includes("rate_limit") && !e?.message?.includes("model_not_available")) throw e;
      }
    }

    raw = raw.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/\s*```$/i, "").trim();

    let parsed: any;
    try {
      parsed = JSON.parse(raw);
    } catch {
      return res.status(500).json({ error: "AI returned invalid JSON. Please try a different prompt." });
    }

    if (!parsed.appName || !parsed.sections) {
      return res.status(500).json({ error: "AI returned incomplete data. Please try again." });
    }

    res.json(parsed);
  } catch (err: any) {
    console.error("AI template generate error:", err?.message ?? err);
    res.status(500).json({ error: err?.message ?? "Generation failed" });
  }
});

// GET /api/ai-templates — list user's templates
router.get("/", async (req, res) => {
  const userId = requireUser(req, res);
  if (!userId) return;
  const templates = await db.select().from(aiTemplatesTable).where(eq(aiTemplatesTable.userId, userId));
  res.json(templates);
});

// POST /api/ai-templates — save a generated template
router.post("/", async (req, res) => {
  const userId = requireUser(req, res);
  if (!userId) return;
  const { appName, description, icon, color, layout, sectionsJson, actionsJson, sampleDataJson, prompt } = req.body;
  const [template] = await db.insert(aiTemplatesTable).values({
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
  }).returning();
  res.status(201).json(template);
});

// GET /api/ai-templates/:id — get a single template
router.get("/:id", async (req, res) => {
  const userId = requireUser(req, res);
  if (!userId) return;
  const [template] = await db.select().from(aiTemplatesTable).where(
    and(eq(aiTemplatesTable.id, req.params.id), eq(aiTemplatesTable.userId, userId))
  );
  if (!template) return res.status(404).json({ error: "Not found" });
  res.json(template);
});

// DELETE /api/ai-templates/:id — delete a template
router.delete("/:id", async (req, res) => {
  const userId = requireUser(req, res);
  if (!userId) return;
  await db.delete(aiSidebarAppsTable).where(
    and(eq(aiSidebarAppsTable.templateId, req.params.id), eq(aiSidebarAppsTable.userId, userId))
  );
  await db.delete(aiTemplatesTable).where(
    and(eq(aiTemplatesTable.id, req.params.id), eq(aiTemplatesTable.userId, userId))
  );
  res.status(204).end();
});

// GET /api/ai-templates/sidebar/apps — get user's sidebar apps
router.get("/sidebar/apps", async (req, res) => {
  const userId = requireUser(req, res);
  if (!userId) return;
  const sidebarApps = await db.select({
    sidebarId: aiSidebarAppsTable.id,
    templateId: aiSidebarAppsTable.templateId,
    sortOrder: aiSidebarAppsTable.sortOrder,
    appName: aiTemplatesTable.appName,
    icon: aiTemplatesTable.icon,
    color: aiTemplatesTable.color,
    description: aiTemplatesTable.description,
  })
    .from(aiSidebarAppsTable)
    .innerJoin(aiTemplatesTable, eq(aiSidebarAppsTable.templateId, aiTemplatesTable.id))
    .where(eq(aiSidebarAppsTable.userId, userId));
  res.json(sidebarApps);
});

// POST /api/ai-templates/sidebar/apps — add to sidebar
router.post("/sidebar/apps", async (req, res) => {
  const userId = requireUser(req, res);
  if (!userId) return;

  const { templateId } = req.body as { templateId: string };
  if (!templateId) return res.status(400).json({ error: "templateId is required" });

  const existing = await db.select().from(aiSidebarAppsTable).where(eq(aiSidebarAppsTable.userId, userId));
  if (existing.length >= SIDEBAR_LIMIT) {
    return res.status(400).json({ error: `Maximum ${SIDEBAR_LIMIT} apps can be added to the sidebar.` });
  }
  if (existing.some(a => a.templateId === templateId)) {
    return res.status(400).json({ error: "App is already in the sidebar." });
  }

  const [app] = await db.insert(aiSidebarAppsTable).values({
    id: uid(),
    userId,
    templateId,
    sortOrder: existing.length,
  }).returning();
  res.status(201).json(app);
});

// DELETE /api/ai-templates/sidebar/apps/:templateId — remove from sidebar
router.delete("/sidebar/apps/:templateId", async (req, res) => {
  const userId = requireUser(req, res);
  if (!userId) return;
  await db.delete(aiSidebarAppsTable).where(
    and(eq(aiSidebarAppsTable.templateId, req.params.templateId), eq(aiSidebarAppsTable.userId, userId))
  );
  res.status(204).end();
});

export default router;
