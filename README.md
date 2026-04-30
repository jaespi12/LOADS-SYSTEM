# LOADS-SYSTEM

LOADS-SYSTEM is a frontend-first engineering application scaffold for defining, validating, and eventually generating structural/ride load cases from governed project inputs.

## Purpose
- Provide a consistent project shell for load governance data, schema validation, and dashboard-oriented review workflows.
- Establish baseline contracts (schemas + lookups + fixtures) before implementing load engines.
- Keep implementation audit-friendly and standards-aligned through explicit code-set/version references.

## Current Scope (Implemented)
- JSON lookup catalogs in `shared/data/`.
- JSON schema contracts in `shared/schemas/`.
- Example fixtures in `app/data/`.
- Browser app shell with modular views in `app/scripts/`.
- Dark, high-contrast UI tokens and components in `shared/styles/` and `app/styles/`.
- Governance and process docs in `docs/`.

## Out of Scope (Current Phase)
- No engineering formulas.
- No dynamic load engines.
- No backend persistence or API integration.

## Repository Structure
- `app/`
  - `data/`: Example payloads used for load/read/validate/render milestones.
  - `scripts/`: ES module app runtime, views, store, and utilities.
  - `styles/`: App-level style layer.
- `shared/`
  - `data/`: Shared lookup catalogs (code sets, load families, statuses, units, etc.).
  - `schemas/`: Shared JSON schema contracts.
  - `styles/`: Shared design tokens/utilities/layout baseline.
- `docs/`: Architecture, implementation planning, UI/UX standards, and change management.
- `.github/`: Contributor-facing automation and assistant instructions.

## Current Standards Baseline
- ASCE/SEI 7-22
- ANSI/AISC 360-22
- ANSI/AISC 341-22
- ACI CODE-318-25
- ASTM F2291-25c

## Workflow
1. Update shared lookup or schema contracts first.
2. Update example fixtures to match changed contracts.
3. Wire load/read/validate/render in `app/scripts/app.js` and relevant views.
4. Confirm syntax and JSON validity locally.
5. Document governance/process changes in `docs/`.

## Status
- Milestone status: app-shell baseline established with design basis, train, kinematics, and load-family read/validate/render views.
- Next expected work: generation orchestration, rule wiring, and engine modules (still formula-free until domain approval).
