# Aurora 4X Companion

A tactical companion app for [Aurora 4X](https://aurora4x.com/). Connects to a running Aurora instance via a C# Harmony patch, providing real-time production tracking, game log analysis, government management, and an AI-powered advisor — all while Aurora remains your primary interface.

> **This is a companion tool, not a replacement client.** Aurora 4X must remain visible and usable as the primary game interface. This reflects the wishes of Aurora's creator, Steve Walmsley.

## Features

### Production Command Center
See everything your empire is building in one place — research, construction, shipyard upgrades, ships, ground training, and terraforming. Sorted by remaining days with full bonus parity matching Aurora Electrons.

- Two views: flat recap sorted by completion, or grouped by colony
- Filter by type, system, or colony
- Sortable columns, summary stats cards
- Data settings panel: refresh interval, force offline, per-type toggles

### Government & AI Advisor
Set up your empire's government with a personality that shapes how your AI advisor thinks and speaks.

- 10 built-in profiles with unique voice and worldview
- Custom profiles, ideology sliders, ministry system with domain assignment
- Supports Claude, OpenAI, and Ollama via Vercel AI SDK
- "No AI" mode available

### Game Log
Browse event history with powerful filtering — collapsible type groups, Aurora custom colors, search, hidden events support.

### Works Online & Offline
- **Bridge mode** — live data from Aurora's memory, auto-refreshes on every tick
- **Offline mode** — reads directly from Aurora's save file, refreshes on save
- **Force offline toggle** — per-tab control to bypass bridge

## How It Works

```
┌──────────────────────────────────────────────────────┐
│        Companion App (Electron + React + TS)         │
│                                                      │
│  Production Recap ─ Game Log ─ AI Advisor ─ Gov't    │
└──────────────────┬───────────────────────────────────┘
                   │  WebSocket (ws://localhost:47842)
┌──────────────────┴───────────────────────────────────┐
│           AdvisorBridge (C# Harmony Patch)           │
│                                                      │
│  BridgeServer ─ MemoryReader ─ ActionExecutor        │
│       │              │               │               │
│   SQL queries   Live game state   UI automation      │
│   via in-memory   via reflection                     │
│   SQLite mirror                                      │
└──────────────────────────────────────────────────────┘
                   │  Harmony patches
┌──────────────────────────────────────────────────────┐
│        Aurora 4X (primary interface, always visible) │
└──────────────────────────────────────────────────────┘
```

## Roadmap

### Returning from the old advisor
These features existed in the previous version and are being rebuilt with the new architecture:
- Fleet Command (fleet/ship overview)
- Minerals & Mining (stockpiles, history charts)
- Research overview
- Route Planner
- System Map

### New features planned
- Warnings & Alerts (low minerals, idle shipyards, contacts)
- Habitability scoring
- Ship Design browser
- Empire Analytics dashboard
- Paradox-style alert bar
- Technologies / Tech tree browser

## Architecture

### Three-Layer Data Architecture
```
Data Provider (SQL or Memory) → typed data objects → Compute (pure math) → UI
```

- **Compute functions are pure** — no SQL, no knowledge of data source, fully testable
- **SqlRecapProvider** fetches from Aurora's SQLite DB (offline or bridge)
- **MemoryBodyProvider** reads system body data from Aurora's RAM in real-time
- **Shared TanStack Query cache** — granular hooks per data type, reusable across pages

### IPC Domains

| Domain | Purpose |
|--------|---------|
| **SESSION** | Game lifecycle, bridge connection, campaign management |
| **EMPIRE** | All game data — production recap, game log, body map |
| **GOVERNMENT** | AI advisor, ministries, personality profiles |
| **SETTINGS** | App config, AI provider, DB path |

## Project Structure

```
aurora4x-companion/
├── app/                          # Renderer (React)
│   ├── components/               # UI (layout, sidebar, tabs, shadcn)
│   ├── hooks/data/               # Data hooks (recap, game log, game date)
│   ├── pages/                    # Route pages (production, log, setup, settings)
│   ├── stores/                   # Zustand stores (session, settings, recap settings)
│   └── modules/                  # Module registry and categories
├── lib/                          # Main + Preload + Shared
│   ├── main/                     # Electron main process
│   ├── preload/                  # Context bridge
│   ├── conveyor/                 # Type-safe IPC (schemas, handlers, API)
│   ├── services/                 # Internal services (bridge, game session, AI)
│   ├── compute/                  # Game log queries, shared types
│   └── recap/                    # Production recap system
│       ├── types.ts              # All data interfaces
│       ├── compute.ts            # Pure math (no SQL)
│       ├── sql-provider.ts       # SQL data fetching
│       ├── memory-provider.ts    # Bridge memory reader
│       ├── get-bodies.ts         # Shared body data utility
│       └── README.md             # Architecture guide for contributors
├── shared/                       # Types shared between main + renderer
├── AuroraPatch/                  # C# codebase (.NET Framework 4.8)
│   ├── AuroraPatch/              # Harmony patch loader
│   ├── Lib/                      # Core library (DB manager, type resolution)
│   ├── AdvisorBridge/            # WebSocket bridge plugin
│   └── build-deploy.bat          # Build and deploy script
└── resources/                    # Build assets
```

## Getting Started (User)

### Prerequisites
- **Aurora 4X** C# version installed

### Setup

1. Download the latest [release](https://github.com/ZionLG/aurora4x-advisor/releases/latest)
2. Install the companion app
3. Place patch files in your Aurora folder:

```
Your Aurora installation/
├── Aurora.exe
├── AuroraPatch.exe             # Launches Aurora with patches
├── 0Harmony.dll
├── Newtonsoft.Json.dll
├── System.Data.SQLite.dll
├── Patches/
│   ├── Lib/
│   │   └── Lib.dll
│   └── AdvisorBridge/
│       ├── AdvisorBridge.dll
│       └── Fleck.dll
└── ...
```

4. Launch Aurora through `AuroraPatch.exe`
5. Start the companion app — it connects automatically

> **Offline mode:** The companion also works without the bridge — just point it at your `AuroraDB.db` file in Settings.

### Linux (via Proton)
Aurora runs through Steam Proton. The companion runs natively. WebSocket connections work across the Wine/Proton boundary.

## Getting Started (Developer)

### Prerequisites
- **Node.js 22+** with npm
- **Visual Studio 2022** with .NET Framework 4.8 targeting pack
- **Aurora 4X** C# version

### Companion App
```bash
git clone https://github.com/ZionLG/aurora4x-advisor.git
cd aurora4x-advisor
npm install
npm run dev
```

### C# Bridge
```bash
cd AuroraPatch
build-deploy.bat
```
Copy your Aurora installation into `AuroraPatch/AuroraPatch/bin/Debug/` and run `AuroraPatch.exe`.

## Development Commands

| Command | Description |
|---------|-------------|
| `npm run dev` | Run with hot reload |
| `npm run lint` | Lint with ESLint |
| `npm run format` | Format with Prettier |
| `npm run build:win` | Package for Windows |
| `npm run build:linux` | Package for Linux |

## Tech Stack

**Companion App:** Electron 40, React 19, TypeScript 5.9, Tailwind CSS 4, Radix UI / shadcn, TanStack Query, Zustand, Vercel AI SDK, Vite 7

**C# Bridge:** .NET Framework 4.8, Harmony 2.2, Fleck 1.2, System.Data.SQLite, Newtonsoft.Json

## Contributing

See `lib/recap/README.md` for the architecture guide on how to add new data features.

Areas where help is needed:
- **New data pages** — Warnings, Minerals, Habitability, Fleet Command
- **Aurora version mappings** — obfuscated field discovery for new Aurora builds
- **Visualizations** — system map, analytics dashboards
- **Testing** — various save files and game states

## License

Source-available, free to use, modify, and distribute. This is a companion tool — please respect the original developer's work and boundaries.

## Acknowledgments

- Steve Walmsley for creating Aurora 4X
- The [AuroraPatch](https://github.com/Aurora-Modders/AuroraPatch) project for the Harmony patching framework
- [Aurora Electrons](https://github.com/UserNamesAreTaken/Aurora-Electrons) for the production recap reference implementation
- The Aurora 4X modding community
