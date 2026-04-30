# LOADS-SYSTEM Agent Rules (Canonical)

This file is the canonical instruction baseline for AI assistants working in this repository.

## Mission
- Build LOADS-SYSTEM incrementally with a frontend-first, contract-driven workflow.
- Prioritize load/read/validate/render milestones before dynamic load engines.

## Hard Constraints
- Use plain JavaScript ES modules for frontend runtime work.
- Do not add frameworks or backend tooling unless explicitly requested.
- Do not introduce engineering formulas unless explicitly approved in scope.
- Keep UI dark, high-contrast, and engineering-focused.

## Governance Baseline
- Code-set references must use explicit edition IDs from `shared/data/code-sets.json`.
- Required load-family baseline includes `DEAD`, `LIVE`, and `SEISMIC`.
- Shared contracts live in `shared/data/` and `shared/schemas/`; app fixtures must remain aligned.

## Implementation Order
1. Update shared contract source (`shared/data`, `shared/schemas`).
2. Update example fixtures (`app/data`).
3. Update runtime load/validate wiring (`app/scripts/app.js`, `store.js`, views).
4. Update docs (`README.md`, `docs/*`) for governance/process deltas.

## Validation Expectations
- Run syntax checks for touched JS modules (`node --check ...`).
- Run JSON validity checks for touched JSON files (`jq empty ...`).
- Report commands and outcomes in final response.

## Documentation Expectations
- Keep README current with purpose, scope, structure, and workflow.
- Keep `docs/ui-ux-standard.md` and `docs/change-management.md` current when standards/process change.

## Adapter Files
- `CLAUDE.md` and `.github/copilot-instructions.md` are thin adapters and must point back to this file.
