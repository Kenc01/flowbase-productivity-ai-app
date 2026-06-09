import { Router } from "express";
import { getAuth } from "@clerk/express";
import Groq from "groq-sdk";
import { logger } from "../lib/logger";

const router = Router();

const ACTIONS: Record<string, string> = {
  grammar:
    "Fix grammar and spelling mistakes. Return only the corrected text, no explanation.",
  rephrase:
    "Rephrase this text in a different way while keeping the same meaning. Return only the rephrased text.",
  shorter:
    "Make this text shorter and more concise. Return only the shortened text.",
  longer:
    "Expand this text with more detail and context. Return only the expanded text.",
  simplify:
    "Simplify this text using plain, easy-to-understand language. Return only the simplified text.",
  formal:
    "Rewrite this text in a formal, professional tone. Return only the rewritten text.",
  casual:
    "Rewrite this text in a friendly, casual tone. Return only the rewritten text.",
  confident:
    "Rewrite this text in a confident, assertive tone. Return only the rewritten text.",
};

// Groq models - most reliable for free tier
const GROQ_MODELS = [
  "llama-3.3-70b-versatile", // best quality, current
  "llama-3.1-70b-versatile", // fallback
  "llama-3.1-8b-instant",    // fast fallback
];

router.post("/", async (req, res) => {
  const auth = getAuth(req);
  if (!auth?.userId) return res.status(401).json({ error: "Unauthorized" });

  const { text, action } = req.body as { text: string; action: string };
  if (!text || !action)
    return res.status(400).json({ error: "Missing text or action" });

  const prompt = ACTIONS[action];
  if (!prompt) return res.status(400).json({ error: "Unknown action" });

  const groqKey = (process.env.GROQ_API_KEY ?? "").trim().replace(/^["']|["']$/g, "");
  if (!groqKey) {
    logger.error("GROQ_API_KEY is not set");
    return res.status(500).json({
      error: "GROQ_API_KEY not set. Get a free key at console.groq.com",
    });
  }

  try {
    const groq = new Groq({
      apiKey: groqKey,
      timeout: 30000,
      maxRetries: 2,
    });

    let result = "";
    let lastErr: any = null;

    for (const model of GROQ_MODELS) {
      try {
        logger.debug({ model, action }, "Attempting AI refine with model");

        const completion = await groq.chat.completions.create({
          model,
          messages: [
            {
              role: "system",
              content:
                "You are a writing assistant. Follow instructions precisely and return only the requested text — no preamble, no explanation, no quotes.",
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
        if (result) {
          logger.debug({ model }, "AI refine succeeded");
          break;
        }
      } catch (modelErr: any) {
        const errMsg = modelErr?.message ?? String(modelErr);
        const status = modelErr?.status || modelErr?.code;

        logger.warn(
          { model, error: errMsg, status },
          "Groq model failed, trying next model",
        );
        lastErr = modelErr;

        // Check if error is retryable
        const isRetryable =
          status === 429 || // Rate limit
          errMsg.includes("rate_limit") ||
          errMsg.includes("model_not_available") ||
          errMsg.includes("overloaded") ||
          errMsg.includes("temporarily");

        if (!isRetryable) {
          logger.error({ model, error: errMsg, status }, "Non-retryable error");
          throw modelErr;
        }
      }
    }

    if (!result) {
      if (lastErr) {
        throw lastErr;
      }
      throw new Error("No response from Groq API");
    }

    res.json({ result });
  } catch (err: any) {
    const errMsg = err?.message ?? String(err);
    const status = err?.status || err?.code;

    logger.error({ error: errMsg, status, action }, "AI refine request failed");

    if (
      errMsg.includes("invalid_api_key") ||
      errMsg.includes("401") ||
      errMsg.includes("Unauthorized")
    ) {
      return res.status(401).json({
        error:
          "Invalid or expired GROQ_API_KEY. Get a free key at console.groq.com",
      });
    }

    if (
      status === 429 ||
      errMsg.includes("rate_limit") ||
      errMsg.includes("429")
    ) {
      const retryMatch =
        errMsg.match(/retry after (\d+\.?\d*)/i) ||
        errMsg.match(/try again in (\d+\.?\d*)/i);
      const delaySecs = retryMatch ? Math.ceil(Number(retryMatch[1])) : 60;
      return res.status(429).json({
        error: `Rate limit exceeded. Please retry after ${delaySecs} seconds.`,
        retryAfter: delaySecs,
      });
    }

    res.status(500).json({ error: errMsg || "AI request failed" });
  }
});

export default router;
