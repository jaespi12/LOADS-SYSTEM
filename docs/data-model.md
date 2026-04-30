# Data Model Snapshot (Current Milestone)

## Purpose
Define package and grouped-case readiness validation contracts before grouped-case math is enabled.

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
