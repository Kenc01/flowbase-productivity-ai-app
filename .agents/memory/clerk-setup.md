---
name: Clerk Auth Setup
description: Clerk is provisioned and wired up for this project
---

Clerk was provisioned with `setupClerkWhitelabelAuth()`. App ID: `app_3EUs7YvF3u45QwgU2NUMG8C68Pr`.

Env vars set: `CLERK_SECRET_KEY`, `CLERK_PUBLISHABLE_KEY`, `VITE_CLERK_PUBLISHABLE_KEY`.

Proxy middleware copied from `.local/skills/clerk-auth/templates/api-server/src/middlewares/clerkProxyMiddleware.ts` to `artifacts/api-server/src/middlewares/clerkProxyMiddleware.ts`.

api-server/app.ts mounts clerkProxyMiddleware before cors/body parsers, then clerkMiddleware using publishableKeyFromHost.

**Why:** Required for Clerk to work in both dev and prod (proxy URL is empty in dev, auto-set in prod).
