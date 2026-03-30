# Aurora 4X Companion

A tactical companion and visualization tool for [Aurora 4X](https://aurora4x.com/). Connects to a running Aurora instance via a C# Harmony patch, providing real-time system maps, fleet overlays, context-aware data panels, and an AI-powered advisor — all while Aurora remains your primary interface.

> **Status:** Active refactor. Infrastructure complete (IPC, state management, data hooks, routing). Feature migration in progress.

## Important Note

This project is a **companion tool**, not a replacement client. Aurora 4X must remain visible, usable, and the primary game interface. This tool assists, enhances, and accelerates your interaction with Aurora — it does not replace it. This distinction is important and reflects the wishes of Aurora's creator, Steve Walmsley.

## How It Works

Aurora 4X is a closed-source .NET WinForms application with obfuscated type names. This project works around that:

1. **AuroraPatch** loads as a launcher, applies [Harmony](https://github.com/pardeike/Harmony) patches to Aurora.exe at runtime
2. **AdvisorBridge** (a patch plugin) starts a WebSocket server inside the Aurora process on `ws://localhost:47842`
3. **MemoryReader** uses cached reflection to read game objects (stars, planets, fleets, ships) directly from Aurora's live memory
4. **The Electron app** connects to the bridge, reads game state, and renders companion visualizations alongside Aurora

```
┌──────────────────────────────────────────────────────┐
│        Companion App (Electron + React + TS)         │
│                                                      │
│  Tactical Map ─ Fleet Overlay ─ AI Advisor ─ Tools   │
└──────────────────┬───────────────────────────────────┘
                   │  WebSocket (ws://localhost:47842)
┌──────────────────┴───────────────────────────────────┐
│           AdvisorBridge (C# Harmony Patch)           │
│                                                      │
│  BridgeServer ─ MemoryReader ─ ActionExecutor        │
│       │              │               │               │
│   SQL queries   Live game state   UI automation      │
│   via in-memory   via reflection   (triggers visible │
│   SQLite mirror                    Aurora actions)   │
└──────────────────────────────────────────────────────┘
                   │  Harmony patches
┌──────────────────────────────────────────────────────┐
│        Aurora 4X (primary interface, always visible) │
└──────────────────────────────────────────────────────┘
```

> **Note on AuroraPatch:** The `AuroraPatch-master/` directory is a **modified fork** of the original [AuroraPatch](https://github.com/Aurora-Modders/AuroraPatch) project. The **Lib** library has been significantly extended with new components (`DatabaseManager`, `SignatureManager`, `KnowledgeBase`, `UIManager`). **AdvisorBridge** is the new project added by this repo. The **Automation** project is from the original AuroraPatch and kept as a reference. The **Example** project has been modified into a dev tool for discovering Aurora's obfuscated types (F12 inspector).

## Features

### Real-Time Tactical Map Viewer

- Canvas-based system map with orbital body rendering alongside Aurora's own map
- Fleet position overlays with movement tracking

### Unified Empire Data

- Single data layer merging SQL and real-time memory — the client never knows the source
- Fleet, ship, mineral, research, and route data through clean domain hooks
- Automatic refresh on game ticks

### AI-Powered Advisor

- LLM-driven advisor that speaks in character based on government archetype and ideology
- Supports Claude (Anthropic), OpenAI, and local Ollama models via Vercel AI SDK
- Interactive chat — ask your advisor about strategy, threats, priorities
- Event-driven alerts — briefings, warnings, and alerts generated on game ticks
- 8 personality archetypes: Nationalist, Technocrat, Communist, Monarchist, Military, Corporate, Diplomatic, Religious

### Planning Tools

- Fleet composition tables with filtering and search
- Route planning engine with fuel burn calculations
- Mineral tracking with historical charts
- Research tree viewer

### Game Bridge

- WebSocket server embedded in the Aurora process via Harmony patching
- Direct memory reads of game objects — no file polling
- **Smart SQL queries with selective save** — auto-detects `FCT_*` tables and only refreshes the relevant save methods
- Push notifications on game tick
- Protocol version handshake

### Auto-Updater

- Built-in auto-update via GitHub Releases (`electron-updater`)

## Architecture

The app uses a clean 4-domain IPC architecture:

| Domain       | Purpose                                                                                     |
| ------------ | ------------------------------------------------------------------------------------------- |
| **SESSION**  | Game lifecycle — campaign selection, bridge connection (hidden internally), game detection  |
| **EMPIRE**   | All game data — fleets, ships, bodies, systems, minerals, research, routes. Source-agnostic |
| **ADVISOR**  | LLM chat, event-driven alerts, personality/archetype matching                               |
| **SETTINGS** | App config, AI provider selection, DB path                                                  |

IPC uses the **Conveyor** system — type-safe with Zod validation, organized as schema + handler + API per domain.

## Project Structure

```
aurora4x-companion/
├── app/                          # Renderer (React)
│   ├── components/               # UI components (layout, window, shadcn)
│   ├── hooks/data/               # Unified data hooks (useFleets, useBodies, etc.)
│   ├── pages/                    # Route pages (dashboard, planning, advisor, settings)
│   ├── stores/                   # Zustand stores (session, settings, advisor)
│   └── router.tsx                # Hash router
├── lib/                          # Main + Preload + Shared library
│   ├── main/                     # Electron main process (app, bootstrap, broadcast)
│   ├── preload/                  # Context bridge (Conveyor API exposure)
│   ├── conveyor/                 # Type-safe IPC system
│   │   ├── schemas/              # Zod schemas (session, empire, advisor, settings)
│   │   ├── handlers/             # Main process handlers
│   │   └── api/                  # Preload API classes
│   ├── services/                 # Internal services (bridge, game session, persistence, AI)
│   ├── compute/                  # Pure game calculations (routes, fleets, minerals)
│   └── advisor/                  # Archetype definitions and ideology matching
├── shared/                       # Shared types and schemas (main + renderer)
├── AuroraPatch-master/           # C# codebase (.NET Framework 4.8)
│   ├── AuroraPatch/              # Harmony patch loader and launcher
│   ├── Lib/                      # Core library (type resolution, DB, UI helpers)
│   ├── AdvisorBridge/            # WebSocket bridge plugin (Fleck)
│   ├── Automation/               # Example automation patch
│   └── Example/                  # Dev tool for type discovery
└── resources/                    # Build assets and config
```

## Getting Started (User)

### Prerequisites

- **Aurora 4X** C# version installed

### Setup

1. Download the latest [companion app release](https://github.com/ZionLG/aurora4x-advisor/releases/latest) for your platform
2. Download the latest C# bridge release
3. Place `AuroraPatch.exe`, `0Harmony.dll`, and other root-level dependencies into your Aurora 4X installation directory (next to `Aurora.exe`)
4. Place the `Lib` and `AdvisorBridge` patch folders into the `Patches/` directory
5. Launch Aurora through `AuroraPatch.exe` instead of `Aurora.exe`
6. Start the companion app — it connects to the bridge automatically

```
Your Aurora installation/
├── Aurora.exe                  # The game (untouched)
├── AuroraPatch.exe             # Launches Aurora with patches
├── 0Harmony.dll
├── Newtonsoft.Json.dll
├── System.Data.SQLite.dll
├── EntityFramework.dll
├── AuroraDB.db
├── Patches/
│   ├── Lib/
│   │   ├── Lib.dll
│   │   └── signatures.json
│   └── AdvisorBridge/
│       ├── AdvisorBridge.dll
│       └── Fleck.dll
└── ...
```

### Linux (via Proton)

Aurora runs through Steam Proton on Linux. The companion app runs natively. The bridge uses Fleck (raw TCP sockets) so WebSocket connections work across the Wine/Proton boundary.

## Getting Started (Developer)

### Prerequisites

- **Node.js 18+** with npm
- **Visual Studio 2022** (or MSBuild) with .NET Framework 4.8 targeting pack
- **Aurora 4X** C# version installed

### Electron Companion App

```bash
git clone https://github.com/ZionLG/aurora4x-advisor.git
cd aurora4x-advisor
git checkout companion-refactor
npm install
npm run dev          # Start with hot reload
```

### C# Bridge

1. Open `AuroraPatch-master/AuroraPatch.sln` in Visual Studio
2. Copy your Aurora 4X installation into `AuroraPatch-master/AuroraPatch/bin/Debug/`
3. Build and deploy:
   ```
   cd AuroraPatch-master
   build-deploy.bat
   ```
4. Run/debug `AuroraPatch.exe` from Visual Studio

## Development Commands

| Command               | Description          |
| --------------------- | -------------------- |
| `npm run dev`         | Run with hot reload  |
| `npm run lint`        | Lint with ESLint     |
| `npm run format`      | Format with Prettier |
| `npm run build:win`   | Package for Windows  |
| `npm run build:linux` | Package for Linux    |

## Tech Stack

**Companion App:** Electron 40, React 19, TypeScript 5.9, Tailwind CSS 4, Radix UI / shadcn, TanStack Query, Zustand, Vercel AI SDK, Vite 7

**C# Bridge:** .NET Framework 4.8, Harmony 2.2, Fleck 1.2, System.Data.SQLite, Newtonsoft.Json, EntityFramework 6

## Contributing

Areas where help is needed:

- **Aurora Version Mappings** — Add obfuscated type/field mappings for new Aurora builds
- **Visualizations** — New tactical overlays, analytics views, and data panels
- **Advisor Events** — Additional game event detectors for the AI advisor
- **Testing** — Test with various Aurora save files and game states

## License

This project is source-available and free to use, modify, and distribute.

Please note: this is intended as a companion tool and not a replacement client for Aurora 4X. We aim to respect the original developer's work and boundaries, and ask that public distributions follow that spirit.

## Acknowledgments

- Steve Walmsley for creating Aurora 4X
- The [AuroraPatch](https://github.com/Aurora-Modders/AuroraPatch) project for the Harmony patching framework
- The Aurora 4X modding community
