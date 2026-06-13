import { Router } from "express";
import { requireUser } from "../middlewares/replitAuth";
import Groq from "groq-sdk";

const router = Router();

const GROQ_MODELS = ["llama-3.3-70b-versatile", "llama-3.1-8b-instant"];

interface DiagramNode {
  id: string;
  label: string;
  shape: "rect" | "oval" | "diamond" | "hexagon";
  color?: string;
  x?: number;
  y?: number;
}
interface DiagramEdge {
  from: string;
  to: string;
  label?: string;
}
interface DiagramSpec {
  diagramType: string;
  title: string;
  nodes: DiagramNode[];
  edges: DiagramEdge[];
}

function uid() {
  return Math.random().toString(36).slice(2, 11) + Math.random().toString(36).slice(2, 11);
}
function rnd() { return Math.floor(Math.random() * 999999); }

function layoutNodes(nodes: DiagramNode[], diagramType: string): DiagramNode[] {
  const COLS = diagramType === "mindmap" ? 1 : 3;
  const NODE_W = 180; const NODE_H = 70; const GAP_X = 60; const GAP_Y = 80;
  const START_X = 200; const START_Y = 200;
  if (diagramType === "mindmap" && nodes.length > 0) {
    const center = nodes[0];
    center.x = 400; center.y = 400;
    const rest = nodes.slice(1);
    const angleStep = (2 * Math.PI) / Math.max(rest.length, 1);
    const radius = 220;
    rest.forEach((n, i) => { n.x = center.x! + Math.cos(i * angleStep - Math.PI / 2) * radius; n.y = center.y! + Math.sin(i * angleStep - Math.PI / 2) * radius; });
  } else {
    nodes.forEach((n, i) => { const col = i % COLS; const row = Math.floor(i / COLS); n.x = START_X + col * (NODE_W + GAP_X); n.y = START_Y + row * (NODE_H + GAP_Y); });
  }
  return nodes;
}

const SHAPE_COLORS: Record<string, string> = { oval: "#dbeafe", rect: "#ede9fe", diamond: "#fef9c3", hexagon: "#dcfce7" };

function specToElements(spec: DiagramSpec): object[] {
  const nodeMap = new Map<string, DiagramNode>();
  const elements: object[] = [];
  const nodeIdMap = new Map<string, string>();
  const NODE_W = 180; const NODE_H = 70;

  spec.nodes.forEach((n) => nodeMap.set(n.id, n));
  spec.nodes.forEach((node) => {
    const eid = uid(); const textEid = uid();
    nodeIdMap.set(node.id, eid);
    const x = node.x ?? 200; const y = node.y ?? 200;
    const bg = node.color ?? SHAPE_COLORS[node.shape] ?? "#ede9fe";
    const type = node.shape === "oval" ? "ellipse" : node.shape === "diamond" ? "diamond" : "rectangle";
    const roundness = type === "rectangle" ? { type: 3 } : type === "ellipse" ? { type: 2 } : null;

    elements.push({ id: eid, type, x, y, width: NODE_W, height: NODE_H, angle: 0, strokeColor: "#1e1e1e", backgroundColor: bg, fillStyle: "solid", strokeWidth: 2, strokeStyle: "solid", roughness: 1, opacity: 100, groupIds: [], frameId: null, roundness, seed: rnd(), version: 1, versionNonce: rnd(), isDeleted: false, boundElements: [{ type: "text", id: textEid }], updated: Date.now(), link: null, locked: false });
    elements.push({ id: textEid, type: "text", x: x + 10, y: y + NODE_H / 2 - 10, width: NODE_W - 20, height: 20, angle: 0, strokeColor: "#1e1e1e", backgroundColor: "transparent", fillStyle: "solid", strokeWidth: 2, strokeStyle: "solid", roughness: 1, opacity: 100, groupIds: [], frameId: null, roundness: null, seed: rnd(), version: 1, versionNonce: rnd(), isDeleted: false, boundElements: null, updated: Date.now(), link: null, locked: false, text: node.label, fontSize: 15, fontFamily: 1, textAlign: "center", verticalAlign: "middle", containerId: eid, originalText: node.label, autoResize: true, lineHeight: 1.25 });
  });

  spec.edges.forEach((edge) => {
    const fromId = nodeIdMap.get(edge.from); const toId = nodeIdMap.get(edge.to);
    if (!fromId || !toId) return;
    const fromNode = nodeMap.get(edge.from)!; const toNode = nodeMap.get(edge.to)!;
    const fx = (fromNode.x ?? 200) + 90; const fy = (fromNode.y ?? 200) + 70;
    const tx = (toNode.x ?? 200) + 90; const ty = toNode.y ?? 200;
    const arrowId = uid();

    elements.push({ id: arrowId, type: "arrow", x: fx, y: fy, width: Math.abs(tx - fx), height: Math.abs(ty - fy), angle: 0, strokeColor: "#6366f1", backgroundColor: "transparent", fillStyle: "solid", strokeWidth: 2, strokeStyle: "solid", roughness: 1, opacity: 100, groupIds: [], frameId: null, roundness: { type: 2 }, seed: rnd(), version: 1, versionNonce: rnd(), isDeleted: false, boundElements: edge.label ? [{ type: "text", id: arrowId + "-lbl" }] : null, updated: Date.now(), link: null, locked: false, points: [[0, 0], [tx - fx, ty - fy]], lastCommittedPoint: null, startBinding: { elementId: fromId, focus: 0, gap: 4 }, endBinding: { elementId: toId, focus: 0, gap: 4 }, startArrowhead: null, endArrowhead: "arrow" });

    if (edge.label) {
      const midX = (fx + tx) / 2; const midY = (fy + ty) / 2;
      elements.push({ id: arrowId + "-lbl", type: "text", x: midX - 40, y: midY - 10, width: 80, height: 20, angle: 0, strokeColor: "#1e1e1e", backgroundColor: "transparent", fillStyle: "solid", strokeWidth: 2, strokeStyle: "solid", roughness: 1, opacity: 100, groupIds: [], frameId: null, roundness: null, seed: rnd(), version: 1, versionNonce: rnd(), isDeleted: false, boundElements: null, updated: Date.now(), link: null, locked: false, text: edge.label, fontSize: 12, fontFamily: 1, textAlign: "center", verticalAlign: "middle", containerId: arrowId, originalText: edge.label, autoResize: true, lineHeight: 1.25 });
    }
  });

  return elements;
}

router.post("/", async (req, res) => {
  const userId = requireUser(req, res);
  if (!userId) return;

  const { prompt } = req.body as { prompt: string };
  if (!prompt) return res.status(400).json({ error: "Missing prompt" });

  const groqKey = process.env.GROQ_API_KEY;
  if (!groqKey) return res.status(500).json({ error: "GROQ_API_KEY not configured" });

  const systemPrompt = `You are a diagram generator. Given a user prompt, output ONLY valid JSON describing a diagram.
Output format:
{
  "diagramType": "flowchart" | "mindmap" | "architecture" | "process",
  "title": "diagram title",
  "nodes": [
    { "id": "n1", "label": "Node Name", "shape": "rect" | "oval" | "diamond" | "hexagon" }
  ],
  "edges": [
    { "from": "n1", "to": "n2", "label": "optional label" }
  ]
}
Rules:
- Use "oval" for start/end nodes in flowcharts
- Use "diamond" for decision nodes
- Use "rect" for process/system nodes
- Use "hexagon" for storage/database nodes
- For mindmaps: first node is center, rest are branches
- Include 4-12 nodes maximum
- Make labels short (1-5 words)
- Only output valid JSON, no markdown, no explanation`;

  try {
    const groq = new Groq({ apiKey: groqKey });
    let raw = "";

    for (const model of GROQ_MODELS) {
      try {
        const completion = await groq.chat.completions.create({ model, messages: [{ role: "system", content: systemPrompt }, { role: "user", content: prompt }], temperature: 0.3, max_tokens: 2048 });
        raw = completion.choices[0]?.message?.content?.trim() ?? "";
        if (raw) break;
      } catch (e: any) {
        if (!e?.message?.includes("rate_limit") && !e?.message?.includes("model_not_available")) throw e;
      }
    }

    raw = raw.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/\s*```$/i, "").trim();

    let spec: DiagramSpec;
    try { spec = JSON.parse(raw); } catch { return res.status(500).json({ error: "AI returned invalid JSON. Please try a different prompt." }); }

    if (!spec.nodes || !Array.isArray(spec.nodes)) return res.status(500).json({ error: "AI returned invalid diagram spec." });

    spec.nodes = layoutNodes(spec.nodes, spec.diagramType ?? "flowchart");
    const elements = specToElements(spec);
    return res.json({ elements, title: spec.title });
  } catch (err: any) {
    console.error("AI diagram error:", err?.message ?? err);
    return res.status(500).json({ error: err?.message ?? "AI diagram generation failed" });
  }
});

export default router;
