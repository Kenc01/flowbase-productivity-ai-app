import express, { type Express, type Request, type Response, type NextFunction } from "express";
import cors from "cors";
import { clerkMiddleware } from "@clerk/express";
import { CLERK_PROXY_PATH, clerkProxyMiddleware, getClerkProxyHost } from "./middlewares/clerkProxyMiddleware.js";
import { replitAuthMiddleware } from "./middlewares/replitAuth.js";
import router from "./routes/index.js";

const app: Express = express();

// Clerk proxy — must be BEFORE express.json()
app.use(CLERK_PROXY_PATH, clerkProxyMiddleware());

app.use(cors({ credentials: true, origin: true }));
app.use(express.json({ limit: "20mb" }));
app.use(express.urlencoded({ extended: true, limit: "20mb" }));

// Clerk auth middleware — safe header access for serverless
app.use(
  clerkMiddleware({
    proxyUrl: (req: Request) => {
      if (process.env.NODE_ENV !== "production") return undefined;
      const host = req.headers?.["x-forwarded-host"];
      return host ? `https://${host}${CLERK_PROXY_PATH}` : undefined;
    },
  } as any)
);

app.use(replitAuthMiddleware);

// All API routes
app.use("/api", router);

// JSON error handler (no pinoHttp in serverless)
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error(err);
  res.status(500).json({ error: err.message ?? "Internal server error" });
});

export default app;
