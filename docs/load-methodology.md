# Load Methodology — Formula Inventory

## Purpose
This file is the **single registry** for every formula that LOADS-SYSTEM intends to apply, regardless of approval state. It captures intent, anchors, scope, and approval status — without recording the equations themselves. Equations land here only after the approval workflow in `docs/design-basis.md` is satisfied.

Per `AGENTS.md`:
> Do not introduce engineering formulas unless explicitly approved in scope.

A formula entry is a **named slot**. Each slot is referenced by:
- `shared/data/code-sets.json` → `formulaScopes[*].formulaIds[]` (eligibility list)
- `shared/data/code-sets.json` → `formulaScopes[*].approvedFormulaIds[]` (currently active list)
- Engine modules under `app/scripts/engines/` — only formulas whose `approvedFormulaIds` membership is current may be evaluated.

## Inventory Schema (per entry)
Each formula entry must declare:

| Field | Required | Description |
| --- | --- | --- |
| `formulaId` | yes | Stable, namespaced ID (e.g., `WL-V-001`). Never reused. |
| `title` | yes | Short human-readable name. |
| `formulaScopeId` | yes | Scope from `code-sets.json` (`WHEEL_LOAD_V0`, `ENVELOPE_V0`, …). |
| `intent` | yes | Qualitative description of what the formula computes. No math. |
| `consumesFields` | yes | Schema-anchored input fields the formula will read. |
| `producesField` | yes | Single output field the formula populates (path inside the result schema). |
| `signConventionRef` | yes | Pointer to the sign-convention authority section in `docs/design-basis.md`. |
| `codeAnchor` | yes | Slot for the controlling code reference (edition + section). Empty string `""` until approved. |
| `status` | yes | `PENDING_APPROVAL` \| `APPROVED` \| `DEPRECATED`. |
| `approvedBy` | when approved | Reviewer attribution (recorded in `docs/change-management.md`). |
| `approvedOn` | when approved | ISO date. |
| `notes` | optional | Free text. No equations until `status = APPROVED`. |

## Scope: WHEEL_LOAD_V0
Outputs land in `wheel-load-result.schema.json`. All entries below are `PENDING_APPROVAL`.

| Formula ID | Title | Produces Field | Code Anchor | Status |
| --- | --- | --- | --- | --- |
| `WL-V-001` | Vertical wheel-load force | `axleResults[*].forces.vertical` | _pending_ | `PENDING_APPROVAL` |
| `WL-L-001` | Lateral wheel-load force | `axleResults[*].forces.lateral` | _pending_ | `PENDING_APPROVAL` |
| `WL-X-001` | Longitudinal wheel-load force | `axleResults[*].forces.longitudinal` | _pending_ | `PENDING_APPROVAL` |
| `WL-MR-001` | Rolling moment about longitudinal axis | `axleResults[*].moments.rolling` | _pending_ | `PENDING_APPROVAL` |
| `WL-MP-001` | Pitching moment about lateral axis | `axleResults[*].moments.pitching` | _pending_ | `PENDING_APPROVAL` |
| `WL-MY-001` | Yawing moment about vertical axis | `axleResults[*].moments.yawing` | _pending_ | `PENDING_APPROVAL` |
| `WL-CTRB-001` | Per-load-family contribution mapping | `axleResults[*].contributions[*]` | _pending_ | `PENDING_APPROVAL` |

### Per-Entry Detail

#### WL-V-001 — Vertical wheel-load force
- **Intent:** Determine the vertical reaction at each axle for a given grouped case, anchored to the design basis and the active load-family selection.
- **Consumes:** `train.sections[*].axles[*].load`, `groupedCase.sourcePositionIds`, `kinematics.entries[*]` (at axle station), `loadFamilies.families[*]`.
- **Produces:** `axleResults[*].forces.vertical`.
- **Sign convention:** see "Sign Convention Authority" in `docs/design-basis.md` (positive upward, opposing gravity).
- **Code anchor:** _pending_ — will name an `ASCE-SEI-7-22` and/or `ASTM-F2291-25C` section.
- **Notes:** Equation absent by design until approval.

#### WL-L-001 — Lateral wheel-load force
- **Intent:** Determine the lateral force at each axle, anchored to kinematics (cant deficiency, speed) and curve radius from `geometry.stations[*].curveRadius`.
- **Consumes:** `geometry.stations[*]`, `kinematics.entries[*]`, `train.sections[*].axles[*].load`, `loadFamilies.families[*]`.
- **Produces:** `axleResults[*].forces.lateral`.
- **Sign convention:** lateral positive to the right of train travel direction (right-hand rule).
- **Code anchor:** _pending_.

#### WL-X-001 — Longitudinal wheel-load force
- **Intent:** Determine the longitudinal force at each axle (braking/traction/thermal effects).
- **Consumes:** `train.sections[*]`, `kinematics.entries[*]`, `loadFamilies.families[*]`.
- **Produces:** `axleResults[*].forces.longitudinal`.
- **Sign convention:** longitudinal positive in direction of train travel.
- **Code anchor:** _pending_.

#### WL-MR-001 — Rolling moment
- **Intent:** Moment about the longitudinal axis at the axle (right-hand rule).
- **Consumes:** outputs of `WL-V-001` and `WL-L-001`, plus `wheelPair.gauge`.
- **Produces:** `axleResults[*].moments.rolling`.
- **Sign convention:** right-hand rule about `localAxes.longitudinal`.
- **Code anchor:** _pending_.

#### WL-MP-001 — Pitching moment
- **Intent:** Moment about the lateral axis at the axle.
- **Consumes:** outputs of `WL-V-001` and `WL-X-001`.
- **Produces:** `axleResults[*].moments.pitching`.
- **Sign convention:** right-hand rule about `localAxes.lateral`.
- **Code anchor:** _pending_.

#### WL-MY-001 — Yawing moment
- **Intent:** Moment about the vertical axis at the axle.
- **Consumes:** outputs of `WL-L-001` and `WL-X-001`.
- **Produces:** `axleResults[*].moments.yawing`.
- **Sign convention:** right-hand rule about `localAxes.vertical`.
- **Code anchor:** _pending_.

#### WL-CTRB-001 — Per-load-family contribution mapping
- **Intent:** Decompose each axle's force vector into per-load-family contributions (`DEAD`, `LIVE`, `SEISMIC`, …) so the sum equals the total force vector when all approved formulas have run.
- **Consumes:** `loadFamilies.families[*]`, all `WL-V-001`/`WL-L-001`/`WL-X-001` outputs.
- **Produces:** `axleResults[*].contributions[*]`.
- **Sign convention:** matches the parent force vector (per-axle `localAxes`).
- **Code anchor:** _pending_.

## Scope: ENVELOPE_V0
Outputs land in `envelope-result.schema.json`. All entries `PENDING_APPROVAL`.

| Formula ID | Title | Produces Field |
| --- | --- | --- |
| `ENV-MAX-001` | Per-station max selection | `components[*].stations[*].max` |
| `ENV-MIN-001` | Per-station min selection | `components[*].stations[*].min` |
| `ENV-ABS-001` | Per-station absolute-max convention | `components[*].stations[*].absMax` |

## Promotion Procedure
A formula entry is promoted from `PENDING_APPROVAL` to `APPROVED` only when **all** of the following are recorded:

1. The equation is added to this file in the Per-Entry Detail block, with the exact code-section anchor populated.
2. The reviewer entry is added to `docs/change-management.md` with `approvedBy` and `approvedOn`.
3. `formulaScopes[*].approvedFormulaIds[]` in `shared/data/code-sets.json` is updated to include the formula ID.
4. The corresponding engine module under `app/scripts/engines/` is updated and its tests confirm:
   - All `PENDING_APPROVAL` formulas continue to emit `null`.
   - The newly approved formula emits a deterministic numeric value.
   - The schema still validates the output.

A formula may be marked `DEPRECATED` only after a successor `formulaId` is `APPROVED` and engines stop reading the deprecated entry.

## Hard Rule
No engine module under `app/scripts/engines/` may emit a non-null numeric value for a `producesField` whose owning `formulaId` is not in the active `approvedFormulaIds` list of its scope. The wheel-load-engine stub enforces this at runtime.
