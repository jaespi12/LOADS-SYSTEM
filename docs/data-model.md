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

## Out of Scope (still gated)
- Wheel-load distribution from axles to grouped cases.
- Superposition of load-family contributions.
- Envelope extraction across grouped cases.
- Any equation-bearing engine modules.
