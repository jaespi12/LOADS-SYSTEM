# LOADS-SYSTEM Implementation Plan

## Goal
Progress from package completeness to grouped-case-ready inputs with explicit blocking checks before grouped-case math.

## Constraints
- Use plain JavaScript ES modules.
- No engineering formulas in this milestone.
- Focus on validation/readiness/render visibility.

## Current Milestone (Completed)
Added grouped-case readiness validation across train, geometry, and train-position contracts, including coverage checks and repeat-length consistency warnings.

## Phase 1 — Readiness Guardrails (current)
### Objectives
- Keep schema validation in place for train-position profile.
- Add cross-contract blocking checks before grouped-case execution.
- Surface readiness status, blocking issues, and warnings in Case Grouping view.

### Deliverables
- `validation.groupedCaseReadiness` state and render visibility.
- Test coverage for missing contract sections, out-of-coverage stations, and repeat-length warning behavior.

## Phase 2 — Grouped-Case Contract Finalization
- Define grouped-case input/output data contracts in detail.
- Add deterministic grouping-window metadata and traceability fields.

## Phase 3 — Grouped-Case Runtime Wiring (still formula-free)
- Wire grouping orchestration and persistence without engineering math.
- Add audit logging for grouped-case readiness and execution path.

## Phase 4 — Math Enablement (future gated)
- Enable grouped-case math only when readiness and contract guardrails remain consistently green.
