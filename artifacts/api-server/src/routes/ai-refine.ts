import { Router } from "express";
import { getAuth } from "@clerk/express";
import Groq from "groq-sdk";

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

// Groq free-tier models in order of preference
const GROQ_MODELS = [
  "llama-3.3-70b-versatile",   // best quality, 30 RPM free
  "llama-3.1-8b-instant",      // fastest, very high free limits
  "mixtral-8x7b-32768",        // good quality, high context
];

router.post("/", async (req, res) => {
  const auth = getAuth(req);
  if (!auth?.userId) return res.status(401).json({ error: "Unauthorized" });

  const { text, action } = req.body as { text: string; action: string };
  if (!text || !action) return res.status(400).json({ error: "Missing text or action" });

  const prompt = ACTIONS[action];
  if (!prompt) return res.status(400).json({ error: "Unknown action" });

  const groqKey = process.env.GROQ_API_KEY;
  if (!groqKey) {
    return res.status(500).json({
      error: "GROQ_API_KEY not set. Get a free key at console.groq.com and add it to .env",
    });
  }

  try {
    const groq = new Groq({ apiKey: groqKey });

    let result = "";
    let lastErr: any = null;

    for (const model of GROQ_MODELS) {
      try {
        const completion = await groq.chat.completions.create({
          model,
          messages: [
            {
              role: "system",
              content: "You are a writing assistant. Follow instructions precisely and return only the requested text — no preamble, no explanation, no quotes.",
            },
            {
              role: "user",
              content: `${prompt}\n\nText:\n${text}`,
            },
          ],
          temperature: 0.5,
          max_tokens: 2048,
        });
        result = completion.choices[0]?.message?.content?.trim() ?? "";
        if (result) break;
      } catch (modelErr: any) {
        const errMsg = modelErr?.message ?? "";
        console.warn(`Groq model ${model} failed:`, errMsg);
        lastErr = modelErr;
        const isRetryable =
          errMsg.includes("rate_limit") ||
          errMsg.includes("model_not_available") ||
          errMsg.includes("decommissioned");
        if (!isRetryable) throw modelErr;
      }
    }

    if (!result && lastErr) throw lastErr;
    res.json({ result });

  } catch (err: any) {
    console.error("AI refine error:", err?.message ?? err);
    const message = err?.message ?? "AI request failed";

    if (message.includes("invalid_api_key") || message.includes("Authentication")) {
      return res.status(500).json({ error: "Invalid GROQ_API_KEY. Get a free key at console.groq.com" });
    }
    if (message.includes("rate_limit") || message.includes("429")) {
      const retryMatch = message.match(/try again in (\d+\.?\d*)/i);
      const retryMsg = retryMatch ? ` Retry in ${Math.ceil(Number(retryMatch[1]))}s.` : " Try again shortly.";
      return res.status(429).json({ error: `Rate limit hit.${retryMsg}` });
    }
    res.status(500).json({ error: message });
  }
});

export default router;
