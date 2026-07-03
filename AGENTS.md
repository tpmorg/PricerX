# Pricernu – Agent Instructions

## Start of session
1. Read `CURRENT_STATE.md` for current context and next steps.
2. Read the relevant task file in `/tasks/` if a specific task is active.
3. Check `git log --oneline -5` for recent commits.

## Commands
- `npm run typecheck` – typecheck all workspaces
- `npm run lint` – lint all workspaces
- `npx convex dev` – start Convex backend (from `backend/convex/`)
- `npm run start` – start Expo dev server (from `apps/mobile/`)

## Key docs (read once, reference as needed)
- `docs/ARCHITECTURE.md` – system architecture
- `docs/DATA_MODEL.md` – SQLite + Convex data model
- `docs/AI_PIPELINE.md` – photo-to-price pipeline
- `docs/CONSTITUTION.md` – project philosophy
- `docs/DECISIONS.md` – decision log
- `docs/WORKFLOW.md` – branch/commit conventions

## Project structure
- `apps/mobile/` – Expo React Native app
- `backend/convex/` – Convex backend
- `packages/shared/` – Shared types, interfaces, mocks
- `tasks/` – Numbered task files (source of truth for what to build)
- `docs/` – Architecture and design docs

## Conventions
- Provider interfaces in `packages/shared/src/providers.ts`
- Domain types in `packages/shared/src/domain.ts`
- Scan workflow in `apps/mobile/src/features/scans/`
- Repositories in `apps/mobile/src/storage/`
- New features start with a task file in `tasks/`
- Add decision records to `docs/DECISIONS.md`
- Update `CURRENT_STATE.md` before branching or at end of session

## End of session
1. Update `CURRENT_STATE.md` with what was accomplished and next steps.
2. Ensure working tree is clean or on a feature branch.
