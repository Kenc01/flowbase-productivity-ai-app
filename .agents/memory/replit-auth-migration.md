---
name: Replit Auth migration
description: How Clerk was replaced with Replit Auth in Grind OS — backend and frontend patterns.
---

# Replit Auth Migration

Clerk was fully removed and replaced with Replit's header-based auth.

## Backend
- Middleware: `artifacts/api-server/src/middlewares/replitAuth.ts`
- `replitAuthMiddleware` — attaches `req.userId` from `x-replit-user-id` header
- `requireUser(req, res)` — returns userId string or sends 401 and returns null
- All 17 route files use `requireUser` instead of Clerk's `getAuth`

## Frontend
- No ClerkProvider — removed from `App.tsx`
- User info read from meta tags injected by Replit proxy: `replit-user-id`, `replit-user-name`, `replit-user-profile-image`
- Unauthenticated users redirected via `window.location.href = "/__replauthlogin?redirect=..."`
- Sign-out: `window.location.href = "/__replauthlogout?redirect=..."`
- Landing page CTAs all point to `/__replauthlogin` (not React router links)

**Why:** Replit's proxy injects auth headers and meta tags automatically. No SDK needed. `/__replauthlogin` is handled by Replit's proxy layer, not the SPA — so use `href` or `window.location.href`, never `<Link>` from wouter.
