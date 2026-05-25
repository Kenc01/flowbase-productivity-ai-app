# FlowBase UI Theme

## Design Direction
FlowBase combines Notion-style structure with Miro-style creative energy. The UI should feel fresh, cozy, modern, and clean: bright surfaces, a deep lively sidebar, compact navigation, colorful icons, and calm spacing.

## Color Palette

### Core Tokens
| Token | Value | Use |
| --- | --- | --- |
| `--fb-bg` | `hsl(214, 36%, 97%)` | Main app background |
| `--fb-surface` | `hsl(0, 0%, 100%)` | Cards, panels, top bars |
| `--fb-surface-hover` | `hsl(210, 34%, 98%)` | Subtle hover surface |
| `--fb-muted` | `hsl(214, 30%, 94%)` | Keyboard chips and quiet fills |
| `--fb-text` | `hsl(226, 28%, 12%)` | Primary text |
| `--fb-text-muted` | `hsl(219, 13%, 48%)` | Secondary text |
| `--fb-border` | `hsl(216, 20%, 88%)` | Default borders |
| `--fb-border-strong` | `hsl(216, 16%, 78%)` | Stronger dividers and controls |

### Sidebar Tokens
| Token | Value | Use |
| --- | --- | --- |
| `--fb-sidebar-bg` | `hsl(231, 33%, 12%)` | Sidebar background |
| `--fb-sidebar-hover` | `hsl(231, 28%, 18%)` | Sidebar hover state |
| `--fb-sidebar-active` | `hsl(231, 25%, 22%)` | Active nav item background |
| `--fb-sidebar-text` | `hsl(221, 18%, 68%)` | Sidebar labels |
| `--fb-sidebar-text-active` | `hsl(0, 0%, 97%)` | Active sidebar labels |
| `--fb-sidebar-label` | `hsl(221, 14%, 48%)` | Group labels and secondary footer text |
| `--fb-sidebar-border` | `hsl(231, 22%, 20%)` | Sidebar dividers |
| `--fb-sidebar-width` | `228px` | Expanded sidebar |
| `--fb-sidebar-width-collapsed` | `60px` | Collapsed sidebar |

### Accent Colors
| Token | Value | Primary Use |
| --- | --- | --- |
| `--fb-violet` | `#7467F0` | Dashboard and primary actions |
| `--fb-cyan` | `#06B6D4` | AI Assistant |
| `--fb-amber` | `#F59E0B` | Calendar and notifications |
| `--fb-emerald` | `#10B981` | Task / Kanban |
| `--fb-rose` | `#F43F5E` | Notes and destructive actions |
| `--fb-indigo` | `#4F46E5` | Whiteboard |
| `--fb-sky` | `#0EA5E9` | Pages / Spaces |
| `--fb-purple` | `#A855F7` | AI Template Builder |
| `--fb-slate` | `#94A3B8` | Settings and neutral controls |

## Typography
Use `Inter` for interface text and `Outfit` for headings and the app name. Keep letter spacing at `0` for normal readability. Sidebar nav items should stay compact at about `0.75rem` to `0.76rem`; dashboard body text can sit around `0.8rem` to `0.9rem`.

## Spacing And Shape
- Base spacing unit: `4px`.
- Sidebar item radius: `8px`.
- Dashboard card radius: `10px` to `12px`.
- Primary content padding: `28px` desktop, reduced on narrow screens.
- Sidebar item padding: compact, about `6px 9px` expanded and `7px` collapsed.
- Avoid nested cards and large decorative background effects.

## Sidebar Behavior
- Expanded sidebar shows the logo, app name, group labels, nav labels, footer labels, and version text.
- Collapsed sidebar is icon-only at `60px` wide and shows hover tooltips.
- Collapse state persists in `localStorage` under `fb-sidebar-collapsed`.
- Active items use a colored left rail, a deeper active background, and the matching accent icon color.

## Dashboard Surface Guidelines
- Use clean white cards on the light app background.
- Use colorful icon tiles sparingly to add energy without making the layout noisy.
- Keep controls dense enough for a productivity app: small buttons, compact search, readable but not oversized headings.
- Dashboard sections should remain unframed layout regions or individual cards, not cards inside cards.
