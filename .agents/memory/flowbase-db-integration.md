---
name: FlowBase DB integration patterns
description: How the 4 features (Kanban, Calendar, Notes, Pages) connect to the API and what patterns to follow for future work
---

## Architecture
- API routes: `/api/kanban/boards`, `/api/calendar`, `/api/notes`, `/api/pages`
- Frontend helper: `artifacts/flowbase/src/lib/api.ts` — thin fetch wrapper, uses BASE_URL prefix
- All mutations use **optimistic updates** (update local state immediately, then fire API call in background)
- All pages show a loading spinner on initial mount (fetching from DB)

## Port conflicts
- Ports 8080 and 19868 get stuck occasionally; fix: `fuser -k 8080/tcp 19868/tcp` before restarting workflows

## Calendar isDraft pattern
- Calendar events use `isDraft: boolean` column to distinguish scheduled vs unscheduled (draft panel)
- On load: split by `isDraft` into `tasks[]` and `drafts[]`
- Dropping a draft onto a date: `PUT /calendar/:id` with `isDraft: false` + `date`

## Auto-save debounce pattern (Notes + Pages)
- 600ms debounce timer on `updateNote`/`updatePage` to avoid API spam while typing
- Show "Saving…" / "Saved" indicator in toolbar

## Notes schema
- `id, userId, title, content, color (#hex), pinned (bool), createdAt, updatedAt`

## Pages schema  
- `id, userId, title, content, emoji, parentId (nullable for root pages)`
- Tree rendered recursively with `PageTreeItem` component
- `deletePage` also deletes all descendant pages (collect IDs recursively, then Promise.all deletes)

**Why optimistic updates:** eliminates perceptible latency since Neon round-trips take ~200-3000ms
