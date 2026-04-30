# Data Model Snapshot (Current Milestone)

## Purpose
Define the in-memory package aggregation model used by the app shell before engine work.

## Aggregated Package Sections
The Home/Project Package summary aggregates these sections:
1. Design Basis
2. Geometry
3. Train
4. Kinematics
5. Load Families

Each section has:
- data presence check,
- schema validation status,
- error details if invalid.

## Required Load Family Rule
In addition to schema validity, package completeness requires presence of all `required: true` IDs from `shared/data/load-family-types.json`.

Current baseline required IDs include:
- `DEAD`
- `LIVE`
- `SEISMIC`

## In-Memory State Shape (Relevant)
- `state.designBasis`
- `state.geometry`
- `state.train`
- `state.kinematics`
- `state.loadFamilies`
- `state.validation.*` including `validation.requiredLoadFamilies`

## Completeness Logic
A package is considered complete only when:
- all required sections are present,
- all section schema validations pass,
- required load-family presence validation passes.
