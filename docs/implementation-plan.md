# LOADS-SYSTEM Implementation Plan

## Goal
Deliver a practical path from validated package aggregation into train-position-ready inputs before grouped-case logic.

## Constraints
- Use plain JavaScript ES modules.
- No engineering formulas in this stage.
- Focus on validation, visibility, and guardrails.

## Current Milestone (Completed)
Added generation-input contract validation and a read-only Train Position / Case Grouping flow with schema-backed profile visibility.

## Phase 1 — Aggregation + Train Position Contract (current)
### Objectives
- Keep package completeness guardrails green.
- Validate train-position profile generated from fixed arc-length stepping assumptions.
- Render train-position metadata, entry count, and validation state in runtime UI.

### Deliverables
- `train-position-profile.schema.json` and fixture wiring.
- Train Position / Case Grouping panel in UI.
- Validation status and error visibility for train-position contract.

## Phase 2 — Grouping Logic Preparation
- Add deterministic grouping window definitions.
- Define superposition input/output contract (still formula-free scaffolding).

## Phase 3 — Grouped-Case Runtime Wiring
- Connect grouping orchestration once contract and rules are approved.
- Persist grouped-case artifacts in state with audit metadata.

## Phase 4 — Math/Engine Enablement (future gated)
- Enable wheel-load/grouped-case math only after contract and guardrail sign-off.
