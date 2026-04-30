# LOADS-SYSTEM Implementation Plan

## Goal
Deliver a practical, incremental path from app-shell validation to export-ready package assembly using current repository structure.

## Constraints
- Use plain JavaScript ES modules.
- Do not introduce engineering formulas in milestone docs or runtime.
- Keep milestones contract-driven and schema-backed.

## Current Milestone Status
Completed baseline aggregation/read/validate/render flow for a Project Package summary with completeness checks across design basis, geometry, train, kinematics, and load families.

## Phase 1 — Package Aggregation Hardening (current)
### Objectives
- Keep all core input sections loadable and validated at startup.
- Surface missing/invalid sections in a single package-level Home view.
- Enforce required load-family presence (`DEAD`, `LIVE`, `SEISMIC`).

### Deliverables
- Project Package completeness panel.
- Section-level readiness summary.
- Required load-family presence check in validation state.

## Phase 2 — Editability and Controlled Mutations
### Objectives
- Add explicit edit flows for each section with deterministic validation-on-change.
- Track revision metadata per section.

## Phase 3 — Generation Orchestration (formula-free scaffolding)
### Objectives
- Build orchestration contracts and run metadata for future engines.
- Keep generation placeholders visible without implementing formulas.

## Phase 4 — Export Package Assembly
### Objectives
- Map validated in-memory package to export contracts.
- Validate export payloads against shared schemas before packaging.

## Phase 5 — QA Automation and Drift Controls
### Objectives
- Add automated drift checks between shared data, schemas, fixtures, and docs.
- Add validation-focused test harness around package completeness rules.
