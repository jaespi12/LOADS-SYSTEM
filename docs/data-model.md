# Data Model Snapshot (Current Milestone)

## Purpose
Define the in-memory package and generation-input contract model used before wheel-load or grouped-case math.

## Aggregated Package Sections
The Home/Project Package summary aggregates and reports these sections:
1. Design Basis
2. Geometry
3. Train
4. Kinematics
5. Load Families

## Generation-Input Contract (Train Position Profile)
Train-position input is represented as a profile generated from fixed arc-length stepping assumptions.

Required fields:
- `positionProfileId`
- `trainId`
- `referenceLineType`
- `stepLength`
- `startStation`
- `endStation`
- `repeatLength`
- `positions[]`

Each position entry includes:
- `positionId`
- `headStation`
- `tailStation`

## Validation Boundaries
- Package completeness still requires all five core sections plus required load-family presence (`DEAD`, `LIVE`, `SEISMIC`).
- Train-position profile is validated as a separate generation-input contract (`validation.trainPositions`).

## Guardrails
- Drift and package checks remain active.
- Train-position view currently provides load/read/validate/render visibility only.
