# CodeMap

Visualize GitHub repositories as interactive dependency graphs. Enter a repo URL, browse directories and files, see import relationships and basic issue highlights, and use the Cerebras agent to supply context for graph creation.

## Features

- **Repo explorer** — Enter any public GitHub repo URL and view its tree (directories and files).
- **Dependency graph** — Parses imports (JS/TS/JSX/TSX/Vue/Svelte/Python) and draws edges between files and directories.
- **Issue highlights** — Heuristic checks (e.g. unmatched brackets, empty files, common error patterns) surface potential problems; affected files and parent directories are marked in the UI.
- **File details panel** — Select a file to see dependencies, estimated token count, and simple complexity/maintainability/reliability metrics.
- **Cerebras integration** — The Cerebras agent supplies necessary info for graph creation (repo summary and token usage), reflected in the status panel when you run “Generate Graph”.

## Tech stack

- **Frontend:** Vite, React 18, React Router, Tailwind CSS, Radix UI (shadcn-style components), Recharts, Lucide icons.
- **Backend:** Convex (auth + agent middleware configured).
- **Data:** GitHub REST API (repo metadata, tree, blobs).
- **LLM:** Cerebras API (`llama3.1-8b`) for repo analysis and token-usage data.

## Prerequisites

- Node.js 18+
- pnpm (or npm/yarn)
- A [Convex](https://convex.dev) project (for auth).
- A [Cerebras](https://cerebras.ai) API key (for the graph-generation workflow).

## Installation

1. **Clone the repo** and install dependencies:

   ```bash
   pnpm install
   ```

2. **Set up Convex** (needed for auth and the Convex client):

   - If this is a **new** Convex project, run:
     ```bash
     npx convex dev
     ```
     The CLI will prompt you to create or link a Convex project and will write `VITE_CONVEX_URL` to `.env.local` for you.

   - If you already have a Convex deployment, copy your deployment URL from the [Convex dashboard](https://dashboard.convex.dev) (Settings → Deployment URL) and add it to `.env.local` (see step 3).

3. **Create `.env.local`** in the project root (if it doesn’t exist) with:

   ```env
   VITE_CONVEX_URL=https://your-deployment.convex.cloud
   VITE_CEREBRAS_API_KEY=your_cerebras_api_key
   ```

   - **VITE_CONVEX_URL** — Your Convex deployment URL (from step 2 or the dashboard).
   - **VITE_CEREBRAS_API_KEY** — Your [Cerebras](https://cerebras.ai) API key (for the graph-generation workflow).

   Ensure `.env.local` is in `.gitignore` and never commit it.

4. **Start the app** — See [Running the app](#running-the-app) below.

## Running the app

**Development**

- In one terminal, run the frontend:
  ```bash
  pnpm dev
  ```
- If you use Convex auth or backend features, run the Convex dev server in another terminal so your backend is live and in sync:
  ```bash
  npx convex dev
  ```

Then open the URL shown (e.g. `http://localhost:5173`).

**Other commands**

```bash
pnpm build        # Production build
pnpm preview      # Preview production build locally
pnpm typecheck    # Type check only
```

## Usage

1. **Home** — Enter a GitHub repo URL (e.g. `https://github.com/owner/repo` or `owner/repo`) and submit to open the repo viewer.
2. **Repo viewer** — Use breadcrumbs to navigate directories; click files to open the details panel. Use “Generate Graph” to run the Cerebras workflow and see token usage in the status panel.
3. **Dashboard** — View a list of repos (from localStorage) and jump to any repo’s map.

## Project structure (high level)

```
├── convex/           # Convex backend (auth, http routes, schema)
├── public/
├── src/
│   ├── components/   # Reusable UI (buttons, cards, dialogs, etc.)
│   ├── pages/        # Home, Dashboard, RepoViewer
│   ├── hooks/
│   ├── lib/
│   ├── App.tsx
│   └── main.tsx
├── index.html
├── package.json
├── summary.md        # Architecture and flow details
└── README.md
```


## License

Private / unlicensed unless otherwise specified.
