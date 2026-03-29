# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

PopMedia - Tauri 2.x desktop app, node-based canvas editor for multimedia + AI content generation.

**Stack**: React 18 + Vite (frontend), Rust + Tauri 2.x (backend), SQLite (rusqlite)

## Commands

```bash
npm run dev      # Vite dev server (frontend only)
npm run build    # Build frontend (tsc + vite build)
tauri dev        # Full Tauri dev (frontend + backend)
tauri build      # Production build
npm run clean:db # Clean SQLite database
```

## Architecture (Read on Demand)

See `docs/ai-content-generation-design.md` for detailed AI system design.

### Quick Overview
- **Frontend** (`src/`): React + React Flow (@xyflow/react) canvas
- **Backend** (`src-tauri/`): Rust commands, SQLite migrations via `include_str!`
- **AI**: Dual-dialog system (ChatDrawer global + NodeAIDialog per-node), shared `AIExecutionEngine`
- **State**: React Context (CanvasContext, ChatContext, NotificationContext)

### Key Files
| File | Purpose |
|------|---------|
| `src-tauri/src/lib.rs` | Tauri setup, command registration, DB init |
| `src/pages/Canvas.tsx` | Main canvas with React Flow |
| `src/services/AIExecutionEngine.ts` | AI execution (3 modes: global/node/cross-node) |
| `src/constants.ts` | Magic numbers (grid:20, node:200x100) |

### Database
- SQLite at `$LOCALAPPDATA/PopMedia/popmedia.db`
- Migrations in `src-tauri/src/db.rs` (inline `include_str!`)

## Documentation Index

| Doc | When to Read |
|-----|--------------|
| `docs/ai-content-generation-design.md` | AI features, IntentClassifier, UpstreamContextManager, dual-dialog system |
| `src-tauri/src/lib.rs` | Tauri commands, plugin setup |
| `src/services/*.ts` | AI services details |
| `src/pages/Canvas.tsx` | Canvas/node/edge system |

## Code Patterns

- Constants in `constants.ts` - no magic numbers
- Tauri commands in `src-tauri/src/commands/*.rs`
- React contexts wrap providers in `App.tsx`: `CanvasProvider > ChatProvider > ReactFlowProvider`
