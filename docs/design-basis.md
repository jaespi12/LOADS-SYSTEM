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
4. `approvedCodeIds` and `approvedFormulaIds` in `shared/data/code-sets.json` are populated for that scope.

Until those four steps complete for a given scope, all engine code emitting numeric outputs for that scope must remain absent or no-op.

## Sign Convention Authority
This section is the **single source of truth** for sign conventions used by every wheel-load and envelope output. It is referenced from `docs/load-methodology.md` (`signConventionRef`) and is anchored to fields already present in `shared/schemas/wheel-load-result.schema.json`.

### Axis Identifiers
The wheel-load schema declares three orthogonal axes per axle via `axleResults[*].localAxes`:

| Schema field | Physical role | Default identifier | Positive direction (default frame) |
| --- | --- | --- | --- |
| `localAxes.longitudinal` | Direction of train travel | `X` | Forward along the reference line in the direction of travel. |
| `localAxes.lateral` | Across the track | `Y` | To the **right** of the direction of travel, looking forward. |
| `localAxes.vertical` | Normal to running surface | `Z` | **Up**, opposing gravity. |

The three axes form a right-handed triad in their default identifier assignment (`X` × `Y` = `Z`). Producers MAY remap which physical role each `X`/`Y`/`Z` plays per axle by writing the chosen identifiers into `localAxes`; consumers MUST honor the per-axle assignment. The right-handed orientation MUST be preserved.

### Force Sign Conventions
The schema field `axleResults[*].forces` carries three signed numbers. Positive values mean:

| Field | Positive convention |
| --- | --- |
| `forces.vertical` | Upward (away from the running surface, opposing gravity). |
| `forces.lateral` | Toward `+Y` (right of travel direction in the default frame). |
| `forces.longitudinal` | Toward `+X` (in the direction of travel; e.g., traction is positive, braking reaction at the rail is positive in the same axle's `+X`). |

A negative value means the opposite direction along the same axis. There is no separate "sign" field — the numeric sign is the convention.

### Moment Sign Conventions
The schema field `axleResults[*].moments` carries three signed numbers. Each follows the **right-hand rule** about its named axis:

| Field | Axis (default) | Positive sense |
| --- | --- | --- |
| `moments.rolling` | longitudinal (`+X`) | Right-hand rule about longitudinal — top of car rolls toward `+Y` (right). |
| `moments.pitching` | lateral (`+Y`) | Right-hand rule about lateral — front of car pitches up toward `+Z`. |
| `moments.yawing` | vertical (`+Z`) | Right-hand rule about vertical — front of car yaws toward `+Y` (right). |

If a producer remaps `localAxes`, the right-hand-rule interpretation is taken about the **chosen** physical axis, not the default identifier.

### Per-Section Overrides
`localAxes` is recorded **per axle result**, not globally. This allows a curved or articulated train to declare different physical axes per section without breaking the contract. Reconciliation rules:

1. Two axles in the same section MUST agree on `localAxes` unless the section's contract explicitly allows per-axle frames (no current section schema does).
2. Two sections in the same train MAY disagree on `localAxes`. Consumers MUST treat each axle in its own declared frame and never silently re-project.
3. Envelope aggregation (`envelope-result.schema.json`) MUST record which `localAxes` it assumes; mixed frames within one envelope channel are forbidden until a frame-reconciliation formula is added to `docs/load-methodology.md` and approved.

### Force-Family Contribution Sign Inheritance
Per-load-family entries in `axleResults[*].contributions[*]` carry the same axis convention as their parent `forces` block. The arithmetic invariant (when all formulas are `APPROVED`):

> for each axle, `forces.{vertical,lateral,longitudinal}` equals the signed sum of the corresponding fields across `contributions[*]`.

Producers MUST NOT introduce contribution decompositions whose signed sum diverges from the parent force vector. Engines that violate this MUST surface a `BLOCKED` readiness with a per-axle blocking issue.

### Authority
This section is the **only** place sign conventions are normatively stated. `docs/load-methodology.md` references it via `signConventionRef`. Schemas reference it via the field semantics enumerated above. Any change to a sign convention requires a new entry in `docs/change-management.md` and bumping the affected `formulaId` (e.g., `WL-V-001` → `WL-V-002`) — never silently editing a published convention.
