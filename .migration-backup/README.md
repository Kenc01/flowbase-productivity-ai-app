<div align="center">

<img src="apps/web/public/logo.png" alt="Grind OS Logo" width="80" height="80" style="border-radius: 16px" />

# Grind OS

**Your all-in-one AI-powered productivity workspace.**

Notes · Kanban · Calendar · Whiteboard · AI Assistant · Live Collaboration

[![pnpm](https://img.shields.io/badge/pnpm-workspace-orange?logo=pnpm)](https://pnpm.io)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue?logo=typescript)](https://www.typescriptlang.org)
[![Vite](https://img.shields.io/badge/Vite-7.x-646CFF?logo=vite)](https://vitejs.dev)
[![Deployed on Vercel](https://img.shields.io/badge/Deployed%20on-Vercel-black?logo=vercel)](https://vercel.com)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

</div>

---

## ✨ Features

| Feature | Description |
|---|---|
| 🤖 **AI Assistant** | Chat with Groq's Llama 3.3 to create tasks, write notes, schedule events, and get productivity insights — hands-free |
| 📊 **Smart Dashboard** | Real-time overview of all your activity — tasks, events, notes, and AI insights in one beautiful view |
| 📅 **Calendar** | Schedule events, set reminders, and track deadlines with color-coded categories |
| 🗂️ **Kanban Boards** | Drag-and-drop task boards with priorities, due dates, labels, and real-time collaboration |
| 📝 **Rich Notes** | Notion-style notes with full formatting, color-coded cards, pinning, and AI content refinement |
| 🎨 **Whiteboard** | Infinite Excalidraw canvas for sketching, diagramming, and visual thinking |
| 🧠 **AI Template Builder** | Generate fully functional mini-apps — habit trackers, budget planners, workout logs — in seconds |
| 👥 **Live Collaboration** | Real-time multi-user presence on Kanban boards with live cursors via Liveblocks |
| ⚙️ **Custom Workspace** | Personalize categories, themes, and settings for every feature |
| 🗓️ **Daily Schedule** | Time-block your day with color-coded activity types |
| 🏆 **Goal Map** | Visualize and track goals and milestones in a structured tree |
| ⏱️ **Deep Work Timer** | Pomodoro-style focus sessions to maximize productivity |

---

## 🛠️ Tech Stack

### Frontend
- **[React 19](https://react.dev)** + **[Vite 7](https://vitejs.dev)** — Lightning-fast SPA
- **[TypeScript](https://www.typescriptlang.org)** — Full type safety
- **[Wouter](https://github.com/molefrog/wouter)** — Lightweight client-side routing
- **[TanStack Query](https://tanstack.com/query)** — Server state management
- **[Radix UI](https://www.radix-ui.com)** + **[Lucide React](https://lucide.dev)** — UI components & icons
- **[Tiptap](https://tiptap.dev)** — Rich text editor for notes
- **[Excalidraw](https://excalidraw.com)** — Whiteboard canvas
- **[Liveblocks](https://liveblocks.io)** — Real-time collaboration

### Backend
- **[Express](https://expressjs.com)** — REST API server
- **[Drizzle ORM](https://orm.drizzle.team)** — Type-safe database queries
- **[Neon](https://neon.tech)** — Serverless PostgreSQL
- **[Groq SDK](https://groq.com)** — AI inference (Llama 3.3 70B)
- **[Clerk](https://clerk.com)** — Authentication & user management
- **[Pino](https://getpino.io)** — Structured logging

### Infrastructure
- **[pnpm Workspaces](https://pnpm.io/workspaces)** — Monorepo management
- **[esbuild](https://esbuild.github.io)** — Fast server bundling
- **[Vercel](https://vercel.com)** — Serverless deployment

---

## 📁 Project Structure

```
grind-os/
├── apps/
│   ├── web/                  # React + Vite frontend
│   │   ├── src/
│   │   │   ├── components/   # Sidebar, HelpPanel, Notifications
│   │   │   ├── pages/        # Dashboard, Landing, Auth pages
│   │   │   └── lib/          # API client, utilities
│   │   └── index.html
│   └── server/               # Express API server
│       ├── src/
│       │   ├── routes/       # API route handlers
│       │   └── index.ts      # Server entry point
│       └── build.mjs         # esbuild bundler config
├── packages/
│   ├── db/                   # Drizzle schema + Neon client
│   ├── api-zod/              # Zod validation schemas
│   ├── api-client-react/     # Generated React API client
│   └── api-spec/             # OpenAPI spec + Orval config
├── api/
│   └── index.mjs             # Vercel serverless entry point
├── vercel.json               # Vercel deployment config
└── pnpm-workspace.yaml       # Workspace configuration
```

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** v20+
- **pnpm** v9+ — `npm install -g pnpm`
- A **Neon** PostgreSQL database
- A **Clerk** account
- A **Groq** API key
- A **Liveblocks** account

### 1. Clone the repository

```bash
git clone https://github.com/Kenc01/grind-os.git
cd grind-os
```

### 2. Install dependencies

```bash
pnpm install
```

### 3. Set up environment variables

Copy the example and fill in your values:

```bash
cp .env.example .env
```

```env
# Database (Neon)
NEON_DATABASE_URL=postgresql://...

# Clerk Auth
CLERK_SECRET_KEY=sk_...
VITE_CLERK_PUBLISHABLE_KEY=pk_...

# Groq AI
GROQ_API_KEY=gsk_...

# Liveblocks
LIVEBLOCKS_SECRET_KEY=sk_...

# App
NODE_ENV=development
PORT=3001
```

### 4. Push the database schema

```bash
pnpm --filter @flowbase/db run db:push
```

### 5. Run locally

```bash
pnpm dev
```

This starts both servers concurrently:
- 🌐 **Frontend** → [http://localhost:5000](http://localhost:5000)
- ⚙️ **API** → [http://localhost:3001](http://localhost:3001)

---

## 🌐 Deployment (Vercel)

### One-click deploy

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/Kenc01/grind-os)

### Manual deployment

1. Push your repository to GitHub
2. Import the project in [Vercel](https://vercel.com/new)
3. Set the following build settings:
   - **Framework Preset**: Other
   - **Build Command**: `pnpm --filter @flowbase/server run build`
   - **Output Directory**: `apps/server/dist`
4. Add all environment variables from your `.env` file
5. Deploy!

> The `vercel.json` at the root is already configured to route all `/api/*` requests to the serverless function.

---

## 📦 Available Scripts

| Command | Description |
|---|---|
| `pnpm dev` | Start both frontend and backend in development mode |
| `pnpm --filter @flowbase/web run dev` | Start frontend only |
| `pnpm --filter @flowbase/server run dev` | Start backend only |
| `pnpm --filter @flowbase/server run build` | Build server for production |
| `pnpm --filter @flowbase/db run db:push` | Push Drizzle schema to database |
| `pnpm --filter @flowbase/db run db:studio` | Open Drizzle Studio |

---

## 🔑 Environment Variables Reference

| Variable | Required | Description |
|---|---|---|
| `NEON_DATABASE_URL` | ✅ | Neon PostgreSQL connection string |
| `CLERK_SECRET_KEY` | ✅ | Clerk backend secret key |
| `VITE_CLERK_PUBLISHABLE_KEY` | ✅ | Clerk frontend publishable key |
| `GROQ_API_KEY` | ✅ | Groq API key for AI features |
| `LIVEBLOCKS_SECRET_KEY` | ✅ | Liveblocks secret for collaboration |
| `PORT` | ❌ | API server port (default: `3001`) |
| `NODE_ENV` | ❌ | Environment (`development` / `production`) |

---

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the project
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📄 License

This project is licensed under the MIT License — see the [LICENSE](LICENSE) file for details.

---

<div align="center">

**Built with ❤️ by [Kenc01](https://keithlar.vercel.app)**

*Stop switching apps. Start grinding.*

</div>
