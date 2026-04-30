# Data Model Snapshot (Current Milestone)

## Purpose
Define the in-memory package aggregation model used by the app shell before train-position generation.

## Aggregated Package Sections
The Home/Project Package summary aggregates and reports these sections:
1. Design Basis
2. Geometry
3. Train
4. Kinematics
5. Load Families

Each section contributes:
- data presence state (`missing` / `invalid` / `ready`),
- schema validation status,
- issue details for package-level visibility.

## Required Load Family Rule
Completeness requires all `required: true` IDs from `shared/data/load-family-types.json`.

Current required baseline IDs:
- `DEAD`
- `LIVE`
- `SEISMIC`

## In-Memory State Shape (Relevant)
- `state.designBasis`
- `state.geometry`
- `state.train`
- `state.kinematics`
- `state.loadFamilies`
- `state.validation.designBasis`
- `state.validation.geometry`
- `state.validation.train`
- `state.validation.kinematics`
- `state.validation.loadFamilies`
- `state.validation.requiredLoadFamilies`

## Completeness Logic
A package is complete only when:
- all five required sections are present,
- section schema validations are valid,
- required load-family presence check passes.

## Guardrails
- `app/tests/package-aggregation.test.js` covers:
  - missing package section,
  - invalid package section,
  - missing required load family (`SEISMIC`).
- `scripts/check-drift.js` checks practical lookup/schema/fixture consistency for load-family IDs and required baseline presence.
