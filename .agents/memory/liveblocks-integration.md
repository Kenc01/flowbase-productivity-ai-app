---
name: Liveblocks integration
description: Real-time collaboration on FlowBase Kanban — auth endpoint, RoomProvider pattern, component locations
---

# Liveblocks Integration

## Auth endpoint
- Backend: `artifacts/api-server/src/routes/liveblocks.ts` — POST `/api/liveblocks/auth`
- Uses `@liveblocks/node` `Liveblocks.identifyUser()` with Clerk `getAuth(req).userId`
- Registered in `artifacts/api-server/src/routes/index.ts` as `/liveblocks`
- Frontend client in `artifacts/flowbase/src/lib/liveblocks.ts` uses `authEndpoint` as an async function (not a string) that POSTs with `credentials: "include"` so Clerk session cookies flow through

## RoomProvider pattern
- `KanbanPage` (default export) is a thin wrapper that reads `activeBoardId` from localStorage and renders `<RoomProvider id={roomId}>` (roomId = `flowbase-board-{boardId}`)
- `KanbanInner` contains all the actual page logic — this split is required for React Fast Refresh compatibility (one default export per file)

**Why:** RoomProvider must wrap components that use Liveblocks hooks; keeping it at KanbanPage level means a different room per board.

## Components
- `artifacts/flowbase/src/components/kanban/CollaboratorAvatars.tsx` — presence avatars in header
- `artifacts/flowbase/src/components/kanban/CollaborationPanel.tsx` — Share/invite dialog (Active Now + Share Access tabs)
- `artifacts/flowbase/src/components/kanban/TaskComments.tsx` — per-task comment threads via `useThreads`/`useCreateThread`/`useCreateComment`

## ThreadMetadata shape
```ts
type ThreadMetadata = { taskId: string; resolved: boolean }
```
Query by `{ metadata: { taskId, resolved: false } }` to get threads for a specific task.

## Presence shape
```ts
type Presence = { cursor: { x: number; y: number } | null; name: string; color: string; avatar: string }
```
Cursor tracking is wired into Presence type but not yet rendered on the board canvas — next step.
