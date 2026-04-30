# LOADS-SYSTEM Implementation Plan

## Goal
Deliver a practical, incremental path from validated package aggregation to train-position generation readiness.

## Constraints
- Use plain JavaScript ES modules.
- No engineering formulas in this stage.
- Focus on visibility, validation, and guardrails.

## Current Milestone (Completed)
Project Package aggregation now includes explicit domain visibility for geometry plus package-level completeness checks and basic guardrail tests/scripts.

## Phase 1 — Aggregation Guardrails (current)
### Objectives
- Render each required section as a visible domain panel (including Geometry).
- Surface package completeness and missing/invalid sections in Home view.
- Enforce required load-family presence (`DEAD`, `LIVE`, `SEISMIC`).
- Add lightweight tests and drift checks.

### Deliverables
- Geometry panel rendered in runtime UI.
- Package aggregation tests for missing/invalid/required-family cases.
- Drift-check script for lookup/schema/fixture consistency.

## Phase 2 — Controlled Editability
- Add deterministic edit flows with immediate validation for each section.
- Add revision metadata and change trace to section state.

## Phase 3 — Train-Position Generation Preparation
- Define input contract for train-position generation.
- Add pre-generation readiness checks that reuse package completeness status.

## Phase 4 — Generation and Export Wiring (future)
- Connect generation orchestration after input contract sign-off.
- Validate generated outputs before export packaging.

## Remaining Principle
Keep generation blocked until package completeness and guardrail checks are consistently green.
