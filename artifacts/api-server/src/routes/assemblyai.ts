import { Router, Request, Response } from "express";
import { requireUser } from "../middlewares/replitAuth";

const router = Router();

const tokenHandler = async (req: Request, res: Response) => {
  const apiKey = process.env.ASSEMBLYAI_API_KEY;
  if (!apiKey || apiKey === "your_assemblyai_api_key_here") {
    return res.status(500).json({
      error: "ASSEMBLYAI_API_KEY not configured. Add your key to Replit Secrets — get one free at https://www.assemblyai.com/app/api-keys",
    });
  }

  try {
    const response = await fetch(
      "https://streaming.assemblyai.com/v3/token?expires_in_seconds=120",
      {
        method: "GET",
        headers: {
          Authorization: apiKey,
          "Content-Type": "application/json",
        },
      },
    );

    if (!response.ok) {
      const body = await response.text();
      console.error("AssemblyAI token error:", response.status, body);
      return res
        .status(response.status)
        .json({ error: `AssemblyAI token request failed: ${response.statusText}` });
    }

    const data = (await response.json()) as { token: string };
    return res.json({ token: data.token });
  } catch (err: any) {
    console.error("AssemblyAI token fetch error:", err?.message ?? err);
    return res.status(500).json({ error: "Failed to create AssemblyAI token" });
  }
};

router.get("/token", tokenHandler);
router.post("/token", tokenHandler);

router.get("/voice-agent-token", async (req: Request, res: Response) => {
  const userId = requireUser(req, res);
  if (!userId) return;

  const apiKey = process.env.ASSEMBLYAI_API_KEY;
  if (!apiKey || apiKey === "your_assemblyai_api_key_here") {
    return res.status(500).json({
      error: "ASSEMBLYAI_API_KEY not configured. Get one free at https://www.assemblyai.com/app/api-keys",
    });
  }

  return res.json({ token: apiKey });
});

export default router;
