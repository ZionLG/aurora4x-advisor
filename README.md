# Aurora 4X Companion

A tactical companion app for [Aurora 4X](https://aurora4x.com/). Connects to a running Aurora instance via a C# Harmony patch, providing real-time empire management, production tracking, warnings, tech browsing, mineral scouting, and terraforming analysis — all while Aurora remains your primary interface.

> **Note:** Starting from Aurora 3.0, Steve (the developer of Aurora) is planning to add code to stop AuroraPatch (one of the dependencies of this repo). The only version this app has been tested on is 2.7.1. This repo will not be developed further.

## Features

### Production Command Center
See everything your empire is building in one place — research, construction, shipyard upgrades, ships, ground training, and terraforming.

- Sorted by remaining days with full commander bonus calculations
- Two views: flat recap sorted by completion, or grouped by colony
- Filter by type, system, or colony
- Sortable columns, summary stats cards
- Data settings panel: refresh interval, force offline, per-type toggles

### Warnings
30 warning types across 6 categories — contacts, economy, ships, populations, administrations, and exploration.

- Sub-category groupings with collapsible panels
- Severity and text filters
- Lifepod time remaining, intruder detection, wrecks, ancient constructs, rifts
- Ship warnings: damage, armor, morale, maintenance, obsolete, fire controls, training

### Tech Tree
Technology browser with research fields sidebar and type-based grouping.

- Research fields with progress bars
- Techs grouped by type with expandable sections
- Status filters: Researched, In Progress, Available, Locked
- Text search across all fields
- Descriptions from Aurora's database, prerequisite chains

### Minerals
Mineral deposit table with advanced filtering.

- Multi-rule filters: material + accessibility range + quantity threshold, stackable with +/-
- System multi-select, column visibility toggles
- Row selection with isolate feature
- Potential, Ground survey, Total Accessibility columns
- Sortable columns with tooltips

### Habitability
Terraforming analyzer with full atmospheric solver.

- Colony cost calculation with ColonizationSkill, gravity checks, dangerous gas rating
- Terraforming time estimation with iterative 32-step atmospheric solver
- Expandable blueprint with actionable instructions: "Set Frigusium to 2.00 maximum atm"
- Toxic gas detail expansion per gas
- Terraform statuses: Yes, Partial, Near, Limited, Insufficient, No, (HG), (LG)
- Species selector, terraformer count input, system filter

### Game Log
Event history with powerful filtering — collapsible type groups, Aurora custom colors, search, hidden events support.

### Quality of Life
- **Tabbed interface** — open multiple pages as tabs, reorder by dragging
- **Pop-out windows** — drag any tab out to a separate window for multi-monitor setups
- **Campaign management** — switch between save files, auto-detect active game from bridge
- **Collapsible sidebar** — categories with flyout menus when collapsed

### Works Online & Offline
- **Bridge mode** — live data from Aurora's memory, auto-refreshes on every tick
- **Offline mode** — reads directly from Aurora's save file, refreshes on save
- **Force offline toggle** — per-tab control to bypass bridge
- **DB file watcher** — auto-refreshes when Aurora saves in any mode

> **Note:** Minerals and Habitability always read from the disk database (not real-time bridge) because the tables they depend on (`FCT_SystemBody`, `FCT_SystemBodySurveys`) have no in-memory save methods in Aurora. Data updates when Aurora saves the game.

> **Unmapped tables:** Due to Aurora's obfuscated save methods, `FCT_AetherRift` and `FCT_Contacts` have no real-time bridge mapping yet. Warnings for rifts and contacts will only appear in offline mode. If you have a save file containing aether rifts or alien contacts, please share it so the mapping can be discovered.

## How It Works

```
+------------------------------------------------------+
|        Companion App (Electron + React + TS)         |
|                                                      |
|  Production - Warnings - Tech Tree - Minerals -      |
|  Habitability - Game Log - Settings                  |
+------------------+-----------------------------------+
                   |  WebSocket (ws://localhost:47842)
+------------------+-----------------------------------+
|           AdvisorBridge (C# Harmony Patch)           |
|                                                      |
|  BridgeServer - MemoryReader - ActionExecutor        |
|       |              |               |               |
|   SQL queries   Live game state   UI automation      |
|   via in-memory   via reflection                     |
|   SQLite mirror                                      |
+------------------------------------------------------+
                   |  Harmony patches
+------------------------------------------------------+
|        Aurora 4X (primary interface, always visible) |
+------------------------------------------------------+
```

## Roadmap

### Next up
- **Information** — freight/colonist transport calculator (Electrons parity)
- **Multi-player race support** — switch between player races in the same game

### Returning features
Utilities from the previous advisor version being rebuilt with the new architecture:
- Fleet Command (fleet/ship overview)
- Route Planner
- Empire Analytics dashboard

### AI Integration
The companion will have an AI layer that acts as your empire's advisory council:

- **Ministries & Advisors** — AI personalities assigned to domains (military, economy, science, diplomacy) with government profiles and ideology sliders
- **Advisory Chat** — ask questions to specific advisors or convene ministry meetings
- **Reactive Events** — the AI listens to game events (contacts, combat, research, colony milestones) and generates narrative briefings, warnings, and recommendations in the style of your government
- Supports Claude, OpenAI, and Ollama. "No AI" mode available.

### Longer term
- **Bridge backend improvements** — additional table mappings, performance
- **Tactical Map** — interactive system/galaxy map
- **Designed Tech** — ship component catalog
- **System Map** — star system network graph

## Architecture

### Three-Layer Data Architecture
```
Data Provider (SQL or Memory) -> typed data objects -> Compute (pure math) -> UI
```

- **Compute functions are pure** — no SQL, no knowledge of data source, fully testable
- **SqlRecapProvider** fetches from Aurora's SQLite DB (offline or bridge)
- **MemoryBodyProvider** reads system body data from Aurora's RAM in real-time
- **Shared TanStack Query cache** — granular hooks per data type, reusable across pages

### Bridge Protocol (v4)
The bridge maintains an in-memory SQLite database populated by calling Aurora's obfuscated save methods. Table-to-method mapping is hardcoded per Aurora checksum with automatic trigger-based discovery for unknown versions.

- **Smart query**: extracts FCT_* tables from SQL, refreshes only those via selective save
- **Freshness cache**: tables marked stale on tick, `markstale` endpoint for manual refresh
- **DIM tables**: copied from disk at startup (static lookup data)
- **Tables without save methods**: FCT_SystemBody, FCT_SystemBodySurveys, FCT_AetherRift, FCT_Contacts — pages using these read from disk DB

### IPC Domains

| Domain | Purpose |
|--------|---------|
| **SESSION** | Game lifecycle, bridge connection, campaign management |
| **EMPIRE** | All game data — production, warnings, tech tree, minerals, habitability, game log |
| **SETTINGS** | App config, DB path |

## Project Structure

```
aurora4x-companion/
+-- app/                          # Renderer (React)
|   +-- components/               # UI (layout, sidebar, tabs, shadcn)
|   +-- hooks/data/               # Data hooks (recap, warnings, tech, minerals, habitability)
|   +-- pages/                    # Route pages (economy, science, system, settings)
|   +-- stores/                   # Zustand stores (session, settings, recap settings)
|   +-- modules/                  # Module registry and categories
+-- lib/                          # Main + Preload + Shared
|   +-- main/                     # Electron main process
|   +-- preload/                  # Context bridge
|   +-- conveyor/                 # Type-safe IPC (schemas, handlers, API)
|   +-- services/                 # Internal services (bridge, game session, db watcher)
|   +-- compute/                  # Shared utilities (date formatting, population formatting)
|   +-- recap/                    # Production recap system
|   +-- warnings/                 # Warning detection (30 types across 6 categories)
|   +-- tech-tree/                # Technology tree queries
|   +-- minerals/                 # Mineral deposit queries
|   +-- habitability/             # Habitability analysis + terraforming solver
+-- shared/                       # Types shared between main + renderer
+-- AuroraPatch/                  # C# codebase (.NET Framework 4.8)
|   +-- AuroraPatch/              # Harmony patch loader
|   +-- Lib/                      # Core library (DB manager, type resolution)
|   +-- AdvisorBridge/            # WebSocket bridge plugin
|   +-- build-deploy.bat          # Build and deploy script
+-- resources/                    # Build assets
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
+-- Aurora.exe
+-- AuroraPatch.exe             # Launches Aurora with patches
+-- 0Harmony.dll
+-- Newtonsoft.Json.dll
+-- System.Data.SQLite.dll
+-- Patches/
|   +-- Lib/
|   |   +-- Lib.dll
|   +-- AdvisorBridge/
|       +-- AdvisorBridge.dll
|       +-- Fleck.dll
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

**Companion App:** Electron 40, React 19, TypeScript 5.9, Tailwind CSS 4, Radix UI / shadcn, TanStack Query, Zustand, Vite 7

**C# Bridge:** .NET Framework 4.8, Harmony 2.2, Fleck 1.2, System.Data.SQLite, Newtonsoft.Json

## Contributing

Areas where help is needed:
- **New data pages** — Information, Designed Tech, Map
- **Aurora version mappings** — obfuscated field discovery for new Aurora builds
- **Visualizations** — system map, analytics dashboards
- **Testing** — various save files and game states

## License

Source-available, free to use, modify, and distribute. This is a companion tool — please respect the original developer's work and boundaries.

## Acknowledgments

- Steve Walmsley for creating Aurora 4X
- The [AuroraPatch](https://github.com/Aurora-Modders/AuroraPatch) project for the Harmony patching framework
- [Aurora Electrons](https://github.com/rubybrowncoat/Aurora-Electrons) — reference implementation for production recap, warnings, tech tree, minerals, habitability (terraforming solver), and game log
- The Aurora 4X modding community
