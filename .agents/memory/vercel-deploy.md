---
name: Vercel deployment
description: How to deploy Grind OS to Vercel from Replit — CLI doesn't work, use REST API; key gotchas with bundling and serverless entry.
---

## Rules

**Vercel CLI is broken for vcp_ tokens.** Even valid `vcp_` personal access tokens are rejected by Vercel CLI v32–v54 with "token not valid". Use the Vercel REST API directly (token works fine with curl/urllib).

**Project info:**
- Project ID: `prj_Ei4MOKsCz8JbBASxHWsziSUi1oEh`
- Team ID: `team_WgTpvCFABHDDH19jaat43Myg`
- Production URL: `https://grind-os-xi.vercel.app`
- Dashboard: `https://vercel.com/kenc01/grind-os`

## Deployment flow (REST API)

1. Build frontend: `BASE_PATH=/ pnpm --filter @workspace/grind-os run build` → `artifacts/grind-os/dist/public/`
2. Build API bundle from `artifacts/api-server/src/vercel-entry.ts` using `esbuild` with `esbuild-plugin-pino` — run the build script **from inside `artifacts/api-server/`** so workspace deps resolve
3. Upload all files via `POST /v2/files` with `x-vercel-digest: sha1(content)` header
4. Create deployment via `POST /v13/deployments` with routes array (no `functions` key needed)
5. Env vars: set once via `POST /v10/projects/{id}/env` — persist across redeploys

## Critical gotchas

**pino must be BUNDLED not externalized.** If `pino` is marked external, esbuild removes it from the bundle but the code still dynamically imports it at runtime → `ERR_MODULE_NOT_FOUND` crash. Use `esbuildPluginPino({ transports: ["pino-pretty"] })` which properly handles pino's worker files. The plugin generates multiple output files (`pino-worker.mjs`, `pino-pretty.mjs`, etc.) — upload them all to `api/` prefix.

**Do NOT use pinoHttp in the Vercel entry.** pinoHttp spawns worker threads which fail silently in serverless; app loads but returns FUNCTION_INVOCATION_FAILED. The `vercel-entry.ts` skips pinoHttp.

**Safe header access in Clerk proxy.** `clerkMiddleware`'s `proxyUrl` callback receives `req` but headers can be empty if not using Express's standard pipeline. Use: `req.headers?.["x-forwarded-host"]` with optional chaining. Direct call to `getClerkProxyHost(req)` from `app.ts` crashed with "Cannot read properties of undefined (reading 'x-forwarded-host')".

**No dotenv in serverless entry.** `app.ts` has `import 'dotenv/config'` which tries to read `.env` (silently ok) but the import adds startup overhead. The `vercel-entry.ts` skips it — Vercel injects env vars directly.

**SSO protection.** Vercel Hobby plan enables SSO protection on preview URLs but NOT on permanent aliases like `grind-os-xi.vercel.app`. Always test against the permanent alias, not the `grind-XXXXX-kenc01s-projects.vercel.app` preview URL.

**Env vars apply to next deployment.** Setting env vars after a deployment requires a new deployment to take effect.

## Vercel entry file

`artifacts/api-server/src/vercel-entry.ts` is the Vercel-specific Express app:
- No `import 'dotenv/config'`
- No `pinoHttp`  
- Safe `req.headers?.["x-forwarded-host"]` access
- Error handler middleware that returns JSON (not empty HTML 500)
- Built separately from `src/index.ts` (which calls `app.listen()`)

**Why:** `src/app.ts` has pinoHttp which spawns workers; `src/index.ts` calls `app.listen()` which hangs serverless. A dedicated entry avoids both.

## Deploy routes config

```json
{
  "routes": [
    { "src": "^/api(.*)", "dest": "/api/index.mjs" },
    { "handle": "filesystem" },
    { "src": "^/(.*)", "dest": "/index.html" }
  ]
}
```

Do NOT use `functions` key in the deployment payload — Vercel auto-detects `.mjs` files as Node.js 20 serverless functions.
