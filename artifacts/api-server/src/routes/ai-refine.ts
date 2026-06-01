import { Router } from "express";
import { getAuth } from "@clerk/express";
import { GoogleGenAI } from "@google/genai";

const router = Router();

const ACTIONS: Record<string, string> = {
  grammar:    "Fix grammar and spelling mistakes. Return only the corrected text, no explanation.",
  rephrase:   "Rephrase this text in a different way while keeping the same meaning. Return only the rephrased text.",
  shorter:    "Make this text shorter and more concise. Return only the shortened text.",
  longer:     "Expand this text with more detail and context. Return only the expanded text.",
  simplify:   "Simplify this text using plain, easy-to-understand language. Return only the simplified text.",
  formal:     "Rewrite this text in a formal, professional tone. Return only the rewritten text.",
  casual:     "Rewrite this text in a friendly, casual tone. Return only the rewritten text.",
  confident:  "Rewrite this text in a confident, assertive tone. Return only the rewritten text.",
};

router.post("/", async (req, res) => {
  const auth = getAuth(req);
  if (!auth?.userId) return res.status(401).json({ error: "Unauthorized" });

  const { text, action } = req.body as { text: string; action: string };
  if (!text || !action) return res.status(400).json({ error: "Missing text or action" });

  const prompt = ACTIONS[action];
  if (!prompt) return res.status(400).json({ error: "Unknown action" });

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return res.status(500).json({ error: "Gemini API key not configured" });

  try {
    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `${prompt}\n\nText:\n${text}`,
    });
    const result = response.text?.trim() ?? "";
    res.json({ result });
  } catch (err: any) {
    console.error("AI refine error:", err);
    res.status(500).json({ error: "AI request failed" });
  }
});

export default router;
