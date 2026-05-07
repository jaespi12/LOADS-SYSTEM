# LOADS-SYSTEM Implementation Plan

## Goal
Progress from package completeness to grouped-case-ready inputs to deterministic grouped-case orchestration, with explicit blocking checks at every gate. No engineering math until Phase 4 is approved.

## Constraints
- Use plain JavaScript ES modules.
- No engineering formulas in this milestone.
- Focus on validation/readiness/render visibility and deterministic orchestration.

## Phase 1 — Readiness Guardrails (completed)
### Objectives
- Keep schema validation in place for train-position profile.
- Add cross-contract blocking checks before grouped-case execution.
- Surface readiness status, blocking issues, and warnings in Case Grouping view.

### Deliverables
- `validation.groupedCaseReadiness` state and render visibility.
- Test coverage for missing contract sections, out-of-coverage stations, and repeat-length warning behavior.

## Phase 2 — Grouped-Case Contract Finalization (completed)
- Upgraded `shared/schemas/grouped-case.schema.json` to capture `groupedCaseId`, `groupingRuleId`, traceability fields, `sourcePositionIds`, `positionCount`, `stationCoverage`, `repeatLengthReference`, and embedded `readiness`.
- Added deterministic grouping-window metadata (`SINGLE_PASS`, `STEP_WINDOW`).
- Documented grouped-case fields in `docs/data-model.md`.

## Phase 3 — Grouped-Case Runtime Wiring (completed, still formula-free)
- `app/scripts/engines/grouping-engine.js` produces schema-conformant grouped cases from a validated train-position profile, train, and global readiness state.
- Grouped cases inherit BLOCKED readiness from global readiness; warnings flow through.
- `app/scripts/store.js` carries `groupedCases`, `groupingResult`, and `groupedCaseValidation`.
- `app/scripts/app.js` runs grouping after readiness and validates each generated case against the schema.
- Case Grouping view renders the rule summary, per-case rows (ID, members, station coverage, repeat reference, readiness), and a schema-conformance line.
- Tests: `app/tests/grouped-case-orchestration.test.js` covers single-pass, step-window with partial last group, deterministic IDs, repeat-consistency flagging, blocked-readiness propagation, empty-positions skip, and unknown-rule fallback.

### Intentional placeholders left for later phases
- No persistence of grouped cases (in-memory only).
- No audit log of orchestration runs.
- No user-driven rule selection in the UI; rule defaults to `STEP_WINDOW` with `windowSize: 2`.
- No rule plug-in registry beyond `GROUPING_RULES`.
- No overlap/stride options on `STEP_WINDOW` (non-overlapping only).
- Stub views for Audit, Envelopes, and Export remain "Planned".

## Phase 4 — Math Enablement (gated, not started)
Enable grouped-case math only when readiness and contract guardrails remain consistently green and the formula scope is explicitly approved per `AGENTS.md`.

### Gaps to close before wheel-load logic
1. Approved formula list anchored to a code-set edition from `shared/data/code-sets.json`.
2. Wheel-load distribution contract: per-axle and per-grouped-case load assignment shape.
3. Load-family contribution mapping: how `DEAD`, `LIVE`, `SEISMIC`, etc. attach to grouped cases.
4. Envelope output contract for max/min results across grouped cases per station.
5. Audit log contract for orchestration + computation runs.
6. Persistence story (local snapshot vs. session-only) for grouped-case results.

## Workflow per AGENTS.md Implementation Order
1. Update shared contract source (`shared/data`, `shared/schemas`).
2. Update example fixtures (`app/data`).
3. Update runtime load/validate/orchestrate wiring (`app/scripts/...`).
4. Update docs (`README.md`, `docs/*`).
