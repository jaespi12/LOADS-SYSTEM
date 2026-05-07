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

## Phase 4 — Math Enablement (gated, contract boundary defined)

### Phase 4a — Computation Boundary Contracts (completed)
- `shared/schemas/wheel-load-result.schema.json` defines the per-grouped-case, per-axle output envelope. Numeric force/moment fields are nullable; `computationContext.computationStatus` enumerates `PENDING_APPROVAL | APPROVED | DEPRECATED`.
- `shared/schemas/envelope-result.schema.json` defines the per-station max/min envelope shape across grouped-case wheel-load results.
- `shared/data/code-sets.json` carries a `formulaScopes[]` registry with `WHEEL_LOAD_V0` and `ENVELOPE_V0` both at `PENDING_APPROVAL` and empty `approvedCodeIds`.
- `app/data/example-wheel-load-result.json` is a schema-conformant fixture with all numerics `null`.
- `app/scripts/utils/validation.js` extended to recurse into nested objects, validate union types (`["number", "null"]`), integers, booleans, and primitive array items — required for the new schemas to be enforceable.
- `app/tests/wheel-load-contract.test.js` asserts schema conformance, computation-status gating, formula-scope registration, and rejection of out-of-spec values.
- `docs/design-basis.md` documents inputs/outputs, candidate codes, and the approval workflow.

### Phase 4a — Intentional placeholders
- No engine module emits wheel-load values yet (`app/scripts/engines/wheel-load-engine.js` remains a stub).
- No UI surface for wheel-load results yet.
- No persistence; results are contract-only.
- No audit log; only the wheel-load `readiness` field is in scope.
- No user-driven formula-scope selection.

### Phase 4b — Math Enablement (not started; gated)
A `formulaScope` may only be promoted to `APPROVED` after **all four** of:
1. Code-section-anchored formula list recorded in `docs/load-methodology.md`.
2. Reviewer sign-off in `docs/change-management.md`.
3. `AGENTS.md` updated to reflect the new approved scope.
4. `approvedCodeIds` populated in `shared/data/code-sets.json` for that scope.

### Remaining gaps before wheel-load math
1. Approved formula list anchored to `ASCE-SEI-7-22` and/or `ASTM-F2291-25C` sections.
2. Sign-convention authority document anchored to the schema's `localAxes`.
3. Unit-system reconciliation policy for cross-unit fixtures.
4. Resolution policy when `groupedCaseReadiness` is `BLOCKED` (skip vs. emit `BLOCKED` wheel-load result).
5. Engine implementation in `app/scripts/engines/wheel-load-engine.js` once a scope is `APPROVED`.
6. UI surface (Outputs → Wheel Load) when results carry non-null values.
7. Audit log contract for orchestration + computation runs.
8. Persistence story (local snapshot vs. session-only) for wheel-load and envelope results.

### Persistence Milestone — v1: single slot (superseded)
Replaced by multi-project workflow below.

### Persistence Milestone — v2: multi-project workflow (in place)
Stores multiple named projects. Storage layout and package format documented in `docs/data-model.md#multi-project-storage-layout`.

| Capability | Status |
| --- | --- |
| Dirty-state tracking on every mutation | Done |
| Debounced autosave (1.5 s) to current project's slot | Done |
| beforeunload warning when dirty | Done |
| New Project (from bundled fixtures) | Done |
| Save (explicit, current slot) | Done |
| Save As (copy to new slot) | Done |
| Open (project picker dropdown) | Done |
| Duplicate project | Done |
| Delete project (with confirm dialog) | Done |
| Export project package as JSON | Done |
| Import JSON → unsaved active project (must Save to persist) | Done |
| Legacy single-slot migration on first boot | Done |
| Bootstrap restores last active project on page load | Done |
| Cross-tab synchronization via `storage` events | Deferred |
| Schema-package migrations (v1 → v2) | Stub — rejects unknown schemaVersion, no migration path yet |
| Undo / redo history | Deferred |
| Server-side persistence | Out of scope (no backend per AGENTS.md) |
| Snapshot of computed outputs (wheel-load / envelope) | Deferred (gated on math approval) |

### Train Tab — Vehicle-Model Editor (in place)
Replaces the generic "Sections & Axles" form with a BEL/Stengel-aligned vehicle-model editor. Schema and fixture updated to carry optional vehicle-model fields; engine math unchanged this pass.

| Capability | Status |
| --- | --- |
| KPI strip (Train ID, Vehicle Type, Sections, Axles, Wheel Pairs, Train Length, First→Last Wheel, Schema status) | Done |
| Two-column workspace (formation editor / derived + warnings) | Done |
| Editable train-level metadata (`trainId`, `trainName`, `vehicleType`, `notes`) | Done |
| Editable section metadata (`id`, `name`, `type`, `length`, `gapToNext`) | Done |
| Editable mass/inertia placeholders (`mass`, `centerOfMass.{x,y,z}`, `inertia.{Ixx,Iyy,Izz}`, `participatesInLoadGen`, `dataSource`) | Done |
| Editable axle metadata (`axleId`, `offset`, `load`, `wheelPairId`, `gauge`, `leftWheelId`, `rightWheelId`) | Done |
| Add / Remove section buttons | Done |
| Add / Remove axle buttons (per section) | Done |
| Derived geometry panel (cumulative starts, total length, first→last wheel distance) | Done |
| Mass & Inertia summary panel | Done |
| Inline engineering warnings (blocking + info severities) | Done |
| Global axle position table (bottom, full width) | Done |
| Wheel-load engine consumes inter-section gaps | Deferred (gated on formula approval) |
| Drag-to-reorder sections | Deferred |
| BEL/Stengel inertia formulas | Deferred (formula-free per AGENTS.md) |
| Per-axle status badges | Deferred |

## Milestone D — UI Consistency and Interaction Hardening (completed)

### Objectives
- Preserve `<details>` open/closed state across `setState()` re-renders (the root `innerHTML` replacement pattern resets all DOM open states).
- Surface expand/collapse intent clearly via `▸` arrow indicator on `<summary>` elements.
- Consistent theming: arrow indicator uses CSS transitions; hover state uses `--accent` color.

### Deliverables
- `app/scripts/app.js`: `captureDetailsState(root)` and `restoreDetailsState(root, map)` helpers wired into `render()` — called before and after `root.innerHTML = ...` to round-trip open/closed state through every repaint.
- `app/scripts/views/train-view.js`: `data-panel-id="sec-{idx}-{geometry|axles|mass}"` on each `<details>` element so the helpers can match them across re-renders.
- `app/styles/components.css`: `summary::before` arrow indicator with 90° CSS transition when `details[open]`; cross-browser marker reset (`::-webkit-details-marker`).
- `app/tests/train-view-panels.test.js`: 4 assertions verifying deterministic panel IDs, correct default open/closed state, ID uniqueness across all sections, and zero IDs on empty trains.

### Intentional deferred items
- Horizontal scroll position of axle tables is still reset on every re-render (secondary issue; no fix this pass).
- When a user clicks a `<summary>` immediately after a blur-triggered re-render, the click lands on a detached element and is lost — the user must click again. This edge case is rare and acceptable until a full virtual-DOM or diff-patch approach is considered.
- No route-level scroll restoration (each tab renders fresh on activate).

## Workflow per AGENTS.md Implementation Order
1. Update shared contract source (`shared/data`, `shared/schemas`).
2. Update example fixtures (`app/data`).
3. Update runtime load/validate/orchestrate wiring (`app/scripts/...`).
4. Update docs (`README.md`, `docs/*`).
