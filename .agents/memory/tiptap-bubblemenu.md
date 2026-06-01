---
name: Tiptap v3 BubbleMenu import
description: Correct import path for BubbleMenu React component in Tiptap v3 — it moved to @tiptap/react/menus subpath
---

In Tiptap v3 (`@tiptap/react@3.x`):

- `BubbleMenu` React component → `import { BubbleMenu } from "@tiptap/react/menus"`
- `@tiptap/extension-bubble-menu` exports the Tiptap **Extension** object (not a React component) — using it as JSX causes "Element type is invalid: got object"
- `@tiptap/react` root does NOT export `BubbleMenu` — importing it from there causes "does not provide an export named 'BubbleMenu'"

**Why:** Tiptap v3 moved menu React components to a `menus` subpath export in `@tiptap/react`. The extension package only contains the ProseMirror plugin logic.

**How to apply:** Any time BubbleMenu or FloatingMenu is used as a JSX component in a Tiptap v3 project, import from `@tiptap/react/menus`. Also configure StarterKit with `underline: false, link: false` if those extensions are added separately to avoid duplicate extension warnings.
