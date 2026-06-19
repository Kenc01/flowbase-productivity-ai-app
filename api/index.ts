// Vercel serverless entry point
// - No dotenv (Vercel injects env vars at runtime)
// - No pinoHttp (spawns worker threads unsupported in serverless)
// - Safe header access for Clerk proxy
import express from "express";
import cors from "cors";
import { clerkMiddleware } from "@clerk/express";
import { CLERK_PROXY_PATH, clerkProxyMiddleware } from "../artifacts/api-server/src/middlewares/clerkProxyMiddleware";
import { replitAuthMiddleware } from "../artifacts/api-server/src/middlewares/replitAuth";
import router from "../artifacts/api-server/src/routes";
import type { Request, Response, NextFunction } from "express";

const app = express();

app.use(CLERK_PROXY_PATH, clerkProxyMiddleware());
app.use(cors({ credentials: true, origin: true }));
app.use(express.json({ limit: "20mb" }));
app.use(express.urlencoded({ extended: true, limit: "20mb" }));

app.use(
  clerkMiddleware({
    proxyUrl: (req: Request) => {
      const forwarded = req.headers?.["x-forwarded-host"];
      const host = (Array.isArray(forwarded) ? forwarded[0] : (forwarded ?? "")).split(",")[0].trim()
        || req.headers?.host?.trim();
      return host ? `https://${host}${CLERK_PROXY_PATH}` : undefined;
    },
  } as any)
);

app.use(replitAuthMiddleware);
app.use("/api", router);

app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  console.error("Unhandled error:", err?.message, err?.stack?.split("\n")[0]);
  res.status(err?.status || 500).json({ error: err?.message || "Internal Server Error" });
});

export default app;
