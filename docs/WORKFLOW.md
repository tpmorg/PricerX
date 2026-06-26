# Workflow

Pricernu should use organized, reviewable work units from the start.

## Branch Prefixes

Use these prefixes consistently:

- `feature/*` — new product or technical capability
- `fix/*` — targeted correction to existing behavior
- `bug/*` — reproduction and fix branch for a confirmed defect
- `docs/*` — documentation-only work
- `chore/*` — repo maintenance, tooling, dependency updates
- `spike/*` — exploratory work that may be discarded

## Commit Style

Commits should be small and meaningful.

Good examples:

- `Add shared provider contracts`
- `Add identity normalization utilities`
- `Document local-first sync strategy`
- `Scaffold mobile mock scan flow`

Avoid vague commits:

- `updates`
- `stuff`
- `more work`
- `wip`

## Pull Request Shape

Every PR should have:

- purpose
- changed areas
- test/validation notes
- follow-up work

## Issue Categories

Use GitHub issues to track:

- features
- bugs
- architecture decisions
- research spikes
- implementation tasks

## Initial Working Model

During early scaffolding:

- documentation foundations may land directly on `main`
- code features should be developed on `feature/*` branches
- larger architectural changes should have a docs update or ADR

## Current Active Branches

- `feature/mobile-mock-scan` — first mobile mock scan scaffold

## Rule Of Thumb

If a change affects product behavior or code, it should usually be a branch and PR.

If a change clarifies the product brain, it may be a direct docs commit while the project is still empty and forming.
