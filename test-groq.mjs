#!/usr/bin/env node

import "dotenv/config";
import Groq from "groq-sdk";

const testGroq = async () => {
  const apiKey = process.env.GROQ_API_KEY;

  if (!apiKey) {
    console.error("❌ GROQ_API_KEY not set in .env");
    process.exit(1);
  }

  console.log("✓ GROQ_API_KEY found");

  try {
    const groq = new Groq({
      apiKey,
      timeout: 30000,
      maxRetries: 2,
    });

    console.log("✓ Groq client initialized");

    const testText = "The qwick brown fox jumps over the layz dog.";
    const action = "grammar";
    const prompt =
      "Fix grammar and spelling mistakes. Return only the corrected text, no explanation.";

    console.log("\n📝 Testing AI Refine with text:", testText);
    console.log("🎯 Action:", action);

    const completion = await groq.chat.completions.create({
      model: "llama-3.1-8b-instant",
      messages: [
        {
          role: "system",
          content:
            "You are a writing assistant. Follow instructions precisely and return only the requested text — no preamble, no explanation, no quotes.",
        },
        {
          role: "user",
          content: `${prompt}\n\nText:\n${testText}`,
        },
      ],
      temperature: 0.5,
      max_tokens: 2048,
    });

    const result = completion.choices[0]?.message?.content?.trim() ?? "";

    console.log("\n✅ Groq API Response:");
    console.log("   Result:", result);
    console.log("\n✓ Groq API is working correctly!");
  } catch (err) {
    console.error("\n❌ Error testing Groq API:");
    console.error("   Message:", err?.message);
    console.error("   Status:", err?.status || err?.code);
    process.exit(1);
  }
};

testGroq();
