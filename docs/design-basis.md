# Design Basis (Computation Boundary)

## Purpose
Establish the formal computation boundary for LOADS-SYSTEM before any wheel-load equations are introduced. This document is the gate between contract-first work (current) and Phase 4 math enablement.

Per `AGENTS.md`:
> Do not introduce engineering formulas unless explicitly approved in scope.

This file enumerates **what will be in scope, what is out of scope, and what is intentionally deferred**, anchored to the current code-set baseline. It is consumed by reviewers approving Phase 4. It does not contain equations.

## Active Code-Set Baseline
The active codes referenced by `shared/data/code-sets.json` are:

| ID | Edition | Discipline |
| --- | --- | --- |
| `ASCE-SEI-7-22` | ASCE/SEI 7-22 | Loads |
| `ANSI-AISC-360-22` | ANSI/AISC 360-22 | Steel Design |
| `ANSI-AISC-341-22` | ANSI/AISC 341-22 | Seismic Steel |
| `ACI-CODE-318-25` | ACI CODE-318-25 | Concrete Design |
| `ASTM-F2291-25C` | ASTM F2291-25c | Ride Systems |

Wheel-load logic anchors against `ASCE-SEI-7-22` (general loading) and `ASTM-F2291-25C` (ride-specific provisions). These are recorded as `candidateCodeIds` for `WHEEL_LOAD_V0` in `shared/data/code-sets.json`. No code is yet listed under `approvedCodeIds`.

## Formula Scope Registry
Formula scopes are tracked in `shared/data/code-sets.json` under `formulaScopes`. Each entry has an explicit `status` and an `approvedCodeIds` list.

| Scope ID | Title | Status | Produces |
| --- | --- | --- | --- |
| `WHEEL_LOAD_V0` | Wheel-Load Computation Boundary | `PENDING_APPROVAL` | `wheel-load-result.schema.json` |
| `ENVELOPE_V0` | Envelope Aggregation Boundary | `PENDING_APPROVAL` | `envelope-result.schema.json` |

Until a scope status flips to `APPROVED`, the engine modules under `app/scripts/engines/` must not produce non-null numeric forces, moments, or envelope values. Schemas enforce this by leaving the corresponding fields nullable.

## Inputs to Wheel-Load Computation (in scope when approved)
The wheel-load computation will consume the following validated artifacts:

1. **Grouped cases** (`shared/schemas/grouped-case.schema.json`)
   - `groupedCaseId`, `sourcePositionIds`, `stationCoverage`, `repeatLengthReference`, `readiness`.
2. **Geometry profile** (`shared/schemas/geometry-station.schema.json`)
   - `stations[]` with `station`, `x`, `y`, `z`, optional `curveRadius`.
3. **Train sections** (`shared/schemas/train-section.schema.json`)
   - `sections[]` → `axles[]` with `offset`, `load`.
4. **Kinematics profile** (`shared/schemas/kinematics-profile.schema.json`)
   - `entries[]` with `station`, `speed`, `cantDeficiency`.
5. **Load families** (`shared/schemas/load-family-profile.schema.json`)
   - Selected `families[]` with `familyId`, `status`, `sourceType`.
6. **Design basis** (`shared/schemas/design-basis.schema.json`)
   - `id`, `codeSet`, `unitSystem`, `status` — propagated into `computationContext`.

## Outputs from Wheel-Load Computation (in scope when approved)
Per-grouped-case wheel-load results, conforming to `shared/schemas/wheel-load-result.schema.json`. Each result will carry:

- Identifiers (`resultId`, `groupedCaseId`, `trainId`, `positionProfileId`).
- `computationContext` (codeSetId, designBasisId, formulaScopeId, formulaRevision, unitSystemId, computationStatus).
- `axleResults[]` — per axle, per source position:
  - `sourceSectionId`, `axleIndex`, `sourcePositionId`, `stationAtAxle`.
  - `localAxes` (longitudinal/lateral/vertical) for unambiguous sign convention.
  - `forces` (vertical, lateral, longitudinal) — nullable until approval.
  - `moments` (rolling, pitching, yawing) — nullable until approval.
  - `contributions[]` per `loadFamilyId` — nullable until approval.
- `envelopeRefs[]` — forward references to envelope outputs (added when `ENVELOPE_V0` is approved).
- `readiness` — `READY` | `BLOCKED` | `PENDING_APPROVAL`.

## Envelope Output (shape only)
Per `envelope-result.schema.json`. Carries per-station max/min for one or more channels (`FORCE_VERTICAL`, `FORCE_LATERAL`, `FORCE_LONGITUDINAL`, `MOMENT_ROLLING`, `MOMENT_PITCHING`, `MOMENT_YAWING`). Numeric `max`/`min`/`absMax` fields are nullable until `ENVELOPE_V0` is approved. Source `sourceWheelLoadResultIds` and `sourceGroupedCaseIds` carry traceability back to the input results.

## Out of Scope (Current Pass)
The following are explicitly excluded from this milestone:

- Any equation-bearing wheel-load math (vertical reactions, lateral allowances, dynamic increments, etc.).
- Any envelope aggregation logic (max/min selection across grouped cases).
- RISA export packaging.
- Persistence of wheel-load results.
- Audit log of computation runs (only the wheel-load `readiness` field is in scope here).
- User-driven formula-scope selection in the UI.

## Intentionally Deferred (Documented as Gaps)
These are recognized as needed but not yet specified:

- Code-set-anchored formula list (which equations from `ASCE-SEI-7-22` / `ASTM-F2291-25C` apply, with section references).
- Sign-convention authority document anchored to `localAxes`.
- Unit-system reconciliation when fixtures cross unit systems.
- Resolution policy when `groupedCaseReadiness` is `BLOCKED` (skip vs. emit `BLOCKED` wheel-load result).
- Approval workflow for promoting a `formulaScope` from `PENDING_APPROVAL` to `APPROVED`.

## Approval Gate
A `formulaScope` may only be marked `APPROVED` after:

1. The formula list (with code-section anchors) is recorded in `docs/load-methodology.md`.
2. Reviewers sign off in `docs/change-management.md`.
3. `AGENTS.md` is updated to reflect the new formula-scope status.
4. `approvedCodeIds` in `shared/data/code-sets.json` is populated for that scope.

Until those four steps complete for a given scope, all engine code emitting numeric outputs for that scope must remain absent or no-op.
