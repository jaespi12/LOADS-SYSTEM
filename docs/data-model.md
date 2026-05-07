# Data Model Snapshot (Current Milestone)

## Purpose
Define package and grouped-case readiness validation contracts before grouped-case math is enabled. Add the orchestration contract that turns a validated train-position profile into deterministic grouped-case envelopes — still formula-free.

## Aggregated Package Sections
The package summary continues to aggregate:
1. Design Basis
2. Geometry
3. Train
4. Kinematics
5. Load Families

## Train-Position Generation Input Contract
Train-position profile is generated from fixed arc-length stepping assumptions and validated via schema.

Key profile fields:
- `positionProfileId`
- `trainId`
- `referenceLineType`
- `stepLength`
- `startStation`
- `endStation`
- `repeatLength`
- `positions[]` with `positionId`, `headStation`, `tailStation`

## Grouped-Case Readiness Validation
Readiness status is derived from cross-contract checks:
- Presence of `train`, `geometry`, and `trainPositions`.
- Geometry coverage checks for `startStation`, `endStation`, and each `positions[*].headStation`.
- Repeat-length consistency check against summed train section length (warning-level where mismatch exists).

Readiness state shape:
- `validation.groupedCaseReadiness.valid`
- `validation.groupedCaseReadiness.blockingIssues[]`
- `validation.groupedCaseReadiness.warnings[]`

## Readiness Semantics
- `valid: false` blocks grouped-case execution.
- warnings do not block execution but are surfaced for engineering review.

## Grouped-Case Orchestration Contract
Grouped cases are produced by `app/scripts/engines/grouping-engine.js` and conform to `shared/schemas/grouped-case.schema.json`. The engine is **formula-free** — it groups positions by deterministic rules without performing wheel-load, superposition, or envelope math.

### Required fields per grouped case
- `groupedCaseId` — `GC-{positionProfileId}-{ruleId}-{NNN}` (deterministic, 1-based, zero-padded)
- `groupingRuleId` — `SINGLE_PASS` | `STEP_WINDOW`
- `trainId`, `positionProfileId` — traceability back to source contracts
- `sourcePositionIds[]` — ordered list of source `positionId` values
- `positionCount` — integer, length of `sourcePositionIds`
- `stationCoverage` — `{ minHeadStation, maxHeadStation, minTailStation?, maxTailStation?, spanLength }`
- `repeatLengthReference` — `{ repeatLength, trainSectionLengthSum?, consistent? }`
- `readiness` — `{ status: "READY" | "BLOCKED", blockingIssues[], warnings[] }`

### Grouping rules (current pass)
| Rule ID | Description |
| --- | --- |
| `SINGLE_PASS` | All positions assembled into one grouped case. |
| `STEP_WINDOW` | Non-overlapping windows of N consecutive positions; default `windowSize` is 2. |

Both rules are deterministic, ordering-preserving, and produce no derived numeric outputs beyond station coverage and repeat-length traceability metadata.

### Readiness propagation
Per-case `readiness` inherits the global `validation.groupedCaseReadiness` state:
- If global readiness has any `blockingIssues`, every grouped case is `BLOCKED`.
- Warnings flow through to per-case `warnings[]` for review.
- The orchestration engine does not introduce new blocking issues at this milestone.

### Schema validation
Each generated grouped case is validated against `grouped-case.schema.json` after creation. The aggregate result is exposed as `state.groupedCaseValidation` and surfaced in the Case Grouping view as a "Schema Conformance" line.

## Wheel-Load Result Contract (shape-only, formula-free)
Wheel-load results conform to `shared/schemas/wheel-load-result.schema.json`. The contract is enforceable today even though no engine populates numeric values yet — all numeric force/moment fields are nullable and the `computationContext.computationStatus` enum carries `PENDING_APPROVAL` until the formula scope is approved.

### Required fields
- `resultId`, `groupedCaseId` — traceability back to the source grouped case.
- `computationContext` — `codeSetId`, `designBasisId`, `formulaScopeId`, `computationStatus` (and optional `formulaRevision`, `unitSystemId`, `computationNotes`).
- `axleResults[]` — per axle:
  - `axleResultId`, `sourceSectionId`, `axleIndex`, `sourcePositionId`, `stationAtAxle`.
  - `localAxes` — `{ longitudinal, lateral, vertical } ⊂ {X, Y, Z}` for unambiguous sign convention.
  - `forces` — `{ vertical, lateral, longitudinal }` each `number | null`.
  - `moments` — `{ rolling, pitching, yawing }` each `number | null`.
  - Optional `wheelPair` and `contributions[]` per `loadFamilyId`.
- `readiness` — `{ status: READY | BLOCKED | PENDING_APPROVAL, blockingIssues, warnings }`.

### Computation status semantics
- `PENDING_APPROVAL`: numeric outputs MUST be `null`; the engine emits the contract shape only.
- `APPROVED`: numeric outputs MAY be populated by the approved formula scope.
- `DEPRECATED`: result is preserved for traceability; consumers should prefer a newer result.

## Envelope Result Contract (shape-only, formula-free)
Envelope outputs conform to `shared/schemas/envelope-result.schema.json`. Carries per-station max/min/absMax channels across grouped-case wheel-load results. Numeric values are nullable until `ENVELOPE_V0` is approved.

Required fields: `envelopeId`, `computationContext`, `stationStations[]`, `components[]` (each with `componentId`, `channel ∈ {FORCE_VERTICAL, FORCE_LATERAL, FORCE_LONGITUDINAL, MOMENT_ROLLING, MOMENT_PITCHING, MOMENT_YAWING}`, and a `stations[]` array of `{ station, max, min, absMax? }`), and `readiness`.

## Code-Set Formula Scope Registry
`shared/data/code-sets.json` now carries a `formulaScopes[]` registry. Each scope is one of:
- `WHEEL_LOAD_V0` — produces `wheel-load-result.schema.json`.
- `ENVELOPE_V0` — produces `envelope-result.schema.json`.

Each scope records `status` (`PENDING_APPROVAL` | `APPROVED` | `DEPRECATED`), `candidateCodeIds`, `approvedCodeIds`, `consumes`, and `produces`. Promotion from `PENDING_APPROVAL` to `APPROVED` is gated by the workflow in `docs/design-basis.md`.

## Project Package (Persistence Format)
The runtime serializes a "project package" to `window.localStorage` (key `LOADS_SYSTEM_PROJECT_v1`) and to/from JSON on Export/Import. The package is a snapshot of user-editable input artifacts only — computed state (grouped cases, validation results, schemas, lookups, nav registry, route) is intentionally **not** persisted; it is recomputed on every load.

Top-level fields:

| Field | Type | Notes |
| --- | --- | --- |
| `schemaVersion` | integer | Currently `1`. `applyProjectPackage` rejects unknown versions. |
| `savedAt` | ISO 8601 string | UTC timestamp written by `buildProjectPackage`. |
| `project` | object | Full project metadata (`projectId`, `name`, nested `designBasis`). |
| `designBasis` | object | Mirrors `project.designBasis` at top-level for direct addressability. |
| `geometry` | object | `geometry-station.schema.json`-conformant profile. |
| `train` | object | `train-section.schema.json`-conformant train. |
| `kinematics` | object | `kinematics-profile.schema.json`-conformant profile. |
| `loadFamilies` | object | `load-family-profile.schema.json`-conformant selection. |
| `trainPositions` | object | `train-position-profile.schema.json`-conformant profile. |

The single source-of-truth for the persisted-field list is `PERSISTED_FIELDS` in `app/scripts/utils/persistence.js`. Adding a new persisted artifact requires:
1. Updating `PERSISTED_FIELDS`.
2. Bumping `SCHEMA_VERSION` if the change is not backward-compatible.
3. Updating this table.

### Dirty-state tracking
`store.js` carries `dirty`, `lastSavedAt`, `loadedFromStorage`, and `persistenceMessage` flags. Mutation handlers in `app.js` set `dirty: true` and schedule a debounced autosave (1.5 s). Save / Reload / Reset / Export / Import actions clear dirty as appropriate.

## Out of Scope (still gated)
- Wheel-load distribution math (numeric outputs remain `null`).
- Superposition of load-family contributions.
- Envelope aggregation math.
- Any equation-bearing engine modules.
- Multi-project storage (current key holds a single active project).
- Server-side persistence; collaborative editing; history/undo beyond browser storage.
