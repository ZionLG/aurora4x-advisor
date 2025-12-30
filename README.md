# Aurora 4X Advisor

An intelligent advisor application for Aurora 4X that analyzes your game saves and provides personalized, roleplay-flavored guidance through customizable advisor personas.

## 🎯 Project Status

**Current Stage:** Architecture Complete, Ready for Implementation

The project architecture has been fully designed with comprehensive documentation. The Electron + React + TypeScript boilerplate is in place, and we're ready to begin implementation.

## 📚 Documentation

**[📖 Complete Documentation Index](docs/README.md)** - Start here for organized navigation

All documentation is organized in the `/docs` directory:

### Architecture Documentation
- **[ARCHITECTURE.md](docs/architecture/ARCHITECTURE.md)** - Complete system architecture
- **[FILE_WATCHER_SYSTEM.md](docs/architecture/FILE_WATCHER_SYSTEM.md)** - Automatic save detection
- **[IMPLEMENTATION_ROADMAP.md](docs/architecture/IMPLEMENTATION_ROADMAP.md)** - 25-day implementation plan
- **[PERSONA_SYSTEM.md](docs/architecture/PERSONA_SYSTEM.md)** - Advisor personality system
- **[OBSERVATION_SYSTEM.md](docs/architecture/OBSERVATION_SYSTEM.md)** - Game state observation
- **[ADVICE_ENGINE.md](docs/architecture/ADVICE_ENGINE.md)** - Personalized advice generation
- **[UI_COMPONENTS.md](docs/architecture/UI_COMPONENTS.md)** - User interface design

### Database Documentation
- **[DATABASE_ANALYSIS.md](docs/database/DATABASE_ANALYSIS.md)** - Complete Aurora DB analysis with SQL queries
- **[DB_DRIVETHROUGH_GUIDE.md](docs/database/DB_DRIVETHROUGH_GUIDE.md)** - Step-by-step database exploration guide
- **[INSTALLATION_REFERENCE.md](docs/database/INSTALLATION_REFERENCE.md)** - All 43 installation types
- **[AuroraDB.db](docs/database/AuroraDB.db)** - Example database for testing

### Quick References
- **[IDEOLOGY_REFERENCE.md](IDEOLOGY_REFERENCE.md)** - Quick reference for ideology stats
- **[QUICK_START.md](QUICK_START.md)** - Developer quick start guide
- **[src/shared/types.ts](src/shared/types.ts)** - TypeScript type definitions

## 🎮 What is Aurora 4X Advisor?

Aurora 4X Advisor acts as your second-in-command, analyzing your Aurora 4X game saves and providing:

- **Situation Analysis**: Detects critical issues, opportunities, and noteworthy events
- **Personalized Advice**: Advice tailored to your chosen advisor's personality and worldview
- **Tutorial Guidance**: Phase-based tutorials that adapt to your empire's development stage
- **Roleplay Immersion**: Distinct advisor personalities with unique voices and perspectives

## ✨ Key Features

### 🎭 Dynamic Advisor Personas

Choose from 8 distinct advisor archetypes, each with unique tone and style:
- **Staunch Nationalist** - Patriotic, strength-focused, proud
- **Technocrat Administrator** - Logical, data-driven, efficiency-focused
- **Communist Commissar** - Revolutionary, collective-focused, ideological
- **Monarchist Advisor** - Traditional, loyal, honorable
- **Military Strategist** - Tactical, pragmatic, combat-focused
- **Corporate Executive** - Profit-driven, business-minded, pragmatic
- **Diplomatic Envoy** - Peaceful, communication-focused, relationship-oriented
- **Religious Zealot** - Faith-driven, prophetic, spiritual

### 🧬 Ideology System

Each persona is shaped by Aurora 4X's racial characteristics (official definitions):
- **Xenophobia (1-100)** - Fear of other races or governments
- **Diplomacy (1-100)** - Ability to persuade other races (offsets Xenophobia)
- **Militancy (1-100)** - Likelihood to choose military force to achieve goals
- **Expansionism (1-100)** - Desire to increase territory
- **Determination (1-100)** - Determination to proceed despite setbacks
- **Trade (1-100)** - Willingness to trade and establish/allow trading posts
- **Translation Skill (-25 to +25)** - Modifier to communication attempts

These stats influence how advisors interpret situations and frame their advice. See [IDEOLOGY_REFERENCE.md](docs/IDEOLOGY_REFERENCE.md) for detailed breakdowns and examples.

### 📊 Comprehensive Observation System

Detects situations across multiple categories:
- **Resources**: Fuel shortages, mineral deficits, wealth problems
- **Research**: Idle labs, tech opportunities, research priorities
- **Military**: Fleet maintenance, readiness, fuel status
- **Expansion**: Colony opportunities, population growth, infrastructure
- **Diplomacy**: Alien contact, relations, trade opportunities
- **Economy**: Production efficiency, labor issues, trade balance

### 📈 Phase-Based Guidance

Adapts advice to your empire's development stage:
- **Setup**: Initial colony, first designs, basic mechanics
- **Early Expansion**: First colonies, survey fleets, basic military
- **Mid-Game**: Multiple colonies, fleet building, tech advancement
- **Late Game**: Advanced tech, multiple empires, complex diplomacy
- **Crisis**: War, economic collapse, disaster response

### 🎨 Customization

- **Create Custom Personas**: Mix archetypes with custom ideology stats
- **Custom Phrases**: Add personalized greetings and responses
- **Adjustable Settings**: Control verbosity, tutorial mode, auto-generation

## 🏗️ Technical Architecture

### Technology Stack
- **Desktop Framework**: Electron 39.2.7
- **UI Framework**: React 19.2.3
- **Language**: TypeScript 5.9.3
- **Database**: better-sqlite3 (reads Aurora 4X save files)
- **Build Tool**: Electron Vite 5.0.0
- **State Management**: React Context API

### System Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Renderer Process                     │
│                      (React UI)                         │
│                                                         │
│  File Loader → Briefing Display → Persona Management    │
└─────────────────────┬───────────────────────────────────┘
                      │ IPC Communication
┌─────────────────────┴───────────────────────────────────┐
│                     Main Process                        │
│                  (Electron Backend)                     │
│                                                         │
│  Database Layer → Observation Detector → Analysis       │
│     ↓                      ↓                 ↓          │
│  SQLite Reader      Situation Detection   Persona       │
│  Query Builder      Template Matching     Application   │
│  Data Extraction    Severity Assessment   Advice Gen    │
└─────────────────────────────────────────────────────────┘
```

### Data Flow

```
Aurora Save File (.db)
    ↓
Database Layer (SQLite queries)
    ↓
Game State (TypeScript models)
    ↓
Observation Detector (neutral facts)
    ↓
Persona Processor (archetype + ideology)
    ↓
Advice Generator (personalized text)
    ↓
Briefing Assembly (complete report)
    ↓
UI Display (React components)
```

## 🚀 Getting Started (Development)

### Prerequisites
- Node.js 18+ (with pnpm)
- Aurora 4X save file for testing
- Code editor (VS Code recommended)

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd aurora4x-advisor

# Install dependencies
pnpm install
```

### Development Commands

```bash
# Run in development mode with hot reload
pnpm dev

# Type check all files
pnpm typecheck

# Lint code
pnpm lint

# Format code
pnpm format

# Build for production
pnpm build

# Package for your platform
pnpm build:mac    # macOS
pnpm build:win    # Windows
pnpm build:linux  # Linux
```

### Next Steps for Implementation

Follow the **[Implementation Roadmap](docs/IMPLEMENTATION_ROADMAP.md)** which breaks development into 9 phases:

1. **Foundation** (Days 1-3) - Database layer and IPC
2. **Observation System** (Days 4-6) - Situation detection
3. **Persona System** (Days 7-9) - Advisor personalities
4. **Advice Engine** (Days 10-12) - Advice generation
5. **UI Development** (Days 13-16) - User interface
6. **Phase System** (Days 17-18) - Tutorial integration
7. **Polish** (Days 19-21) - Advanced features
8. **Testing** (Days 22-23) - Comprehensive testing
9. **Release** (Days 24-25) - Packaging and distribution

## 📖 Usage (Once Implemented)

### First Time Setup
1. **Copy** the `aurora4x-advisor` folder into your Aurora 4X installation directory
2. **Launch** the Aurora 4X Advisor
3. **Follow** the setup wizard:
   - Confirm Aurora installation path
   - Name your game (e.g., "Terran Empire")
   - Enable automatic save watching
4. **Start playing** Aurora 4X - the advisor watches for saves automatically

### Daily Use
1. **Play** Aurora 4X as normal
2. **Save** your game in Aurora
3. **Advisor detects** the save automatically and creates a snapshot
4. **Notification appears** (optional) when new save is detected
5. **Generate briefing** to receive personalized advice
6. **Review** observations and suggested actions
7. **Return** to Aurora and implement recommendations

The advisor automatically creates timestamped snapshots in `advisor-snapshots/<your-game>/` for future historical analysis.

## 🎨 Example Briefing

```
===========================================
BRIEFING FOR TERRAN EMPIRE
Year 2025
Advisor: Admiral Konstantin
===========================================

Commander! The Terran Empire awaits your orders.

CRITICAL SITUATION! We face 2 urgent matters requiring immediate
attention, plus 3 additional concerns.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

PRIORITY 1 - CRITICAL [Resources]
Commander! Our 1st Fleet and 3rd Fleet are dangerously low on fuel
at 25%—leaving our forces exposed to hostile alien forces! We cannot
show such vulnerability when enemies lurk beyond our borders. I demand
immediate refueling operations to restore our defensive strength!

Suggested Actions:
→ Refuel affected fleets (Easy)
  Send tankers to resupply low-fuel fleets
→ Increase fuel production (Moderate)
  Build additional refineries or sorium harvesters

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

[More observations...]

For the glory of the homeland!
```

## 🤝 Contributing

Contributions are welcome! Areas where help is needed:

- **Aurora DB Expertise**: Help map the database schema
- **Additional Personas**: Create more default advisor personalities
- **Observation Detection**: Add more situation detectors
- **UI/UX Design**: Improve the interface and experience
- **Testing**: Test with various Aurora save files
- **Documentation**: Improve guides and tutorials

## 📜 License

[License to be determined]

## 🙏 Acknowledgments

- Steve Walmsley and the Aurora 4X community
- Contributors to this project
- The Electron and React communities

## 📞 Support

- **Issues**: Report bugs via GitHub Issues
- **Discussions**: General questions and feedback
- **Documentation**: Check the `/docs` directory

---

**Note:** This project is currently in the architecture phase. The implementation roadmap provides a clear path to a fully functional application. Follow the roadmap sequentially for best results.

**Made with ⚡ Electron, ⚛️ React, and 📘 TypeScript**
