# LOADS-SYSTEM Implementation Plan

## Goal
Deliver a practical, incremental path from current app shell to a working data-to-export workflow using the existing repository structure.

## Constraints
- Use existing files and folders as primary structure.
- Do not introduce final engineering formulas in planning docs.
- Prioritize schema-backed data handling and traceable state transitions.

## Phase 0 — Baseline hardening (short)

### Objectives
- Ensure the scaffolded shell reliably boots and fails gracefully.
- Confirm static data and schema JSON files remain valid.

### Tasks
1. Add lightweight startup checks:
   - Verify all configured `shared/data/*` files are fetchable.
   - Render explicit missing-file diagnostics.
2. Add scriptable validation checks:
   - JSON parse checks for `shared/data` and `shared/schemas`.
3. Add minimal README run instructions and expected local workflow.

### Deliverables
- Stable shell startup behavior.
- Repeatable local validation command set.

## Phase 1 — Domain state model and validation wiring

### Objectives
- Move from lookup-only state to structured domain entities.
- Wire schema validation into ingest/edit flows.

### Tasks
1. Expand `app/scripts/store.js` shape to include:
   - `designBasis`
   - `trainSections`
   - `geometryStations`
   - `loadCases`
   - `groupedCases`
   - `audit`
2. Introduce a validation utility in `app/scripts/utils/validation.js`:
   - Schema selection by entity type.
   - Error list normalization for UI display.
3. Use schema checks before committing state changes.
4. Connect at least one starter view per entity in `app/scripts/views/`.

### Deliverables
- Schema-gated state mutation.
- Basic forms/views persisting valid domain objects.

## Phase 2 — Engine orchestration and computed outputs

### Objectives
- Integrate existing engine modules as deterministic transformation steps.
- Establish a simple pipeline from inputs to derived artifacts.

### Tasks
1. Define canonical engine I/O contracts (plain objects, no DOM dependencies).
2. Build orchestrator flow in app runtime:
   - Inputs from store
   - Execute selected engines
   - Store derived outputs with metadata (timestamp, source IDs)
3. Add audit trace entries for each run:
   - Which engine ran
   - Input snapshot references
   - Validation status of outputs

### Deliverables
- Reproducible derived result generation.
- Inspectable audit trail in state.

## Phase 3 — Export assembly and target adapters

### Objectives
- Convert internal state to exportable artifacts.
- Align package structure with `risa-export.schema.json` and target catalogs.

### Tasks
1. Implement/expand `app/scripts/export/risa-export.js`:
   - Mapper from store domain objects to export payload.
2. Add export orchestration in `engines/export-engine.js`:
   - Target selection using `shared/data/export-targets.json`.
3. Validate assembled export payload against schema before download/save.
4. Add download flow (JSON initially, target-specific adapters next).

### Deliverables
- Working JSON export pipeline.
- RISA export package scaffold produced from in-app state.

## Phase 4 — UI composition and workflow completion

### Objectives
- Connect route/view shell with full workflow sequence.
- Improve usability for data entry, review, grouping, and export.

### Tasks
1. Wire navigation metadata (`shared/nav/app-registry.json`, `shared/nav/nav.js`) to dynamic view switching.
2. Activate component library (`components/`) in views:
   - Data grid
   - Filter panel
   - Stat cards
   - Revision badges
3. Add status transitions using `shared/data/status-options.json`.
4. Provide inline validation and audit feedback in UI.

### Deliverables
- End-to-end app flow: setup -> define -> compute -> review -> export.

## Phase 5 — QA, documentation, and release readiness

### Objectives
- Stabilize quality and close documentation gaps.

### Tasks
1. Automated checks:
   - Unit tests for store and validation utilities.
   - Schema conformance tests for sample fixtures and exports.
2. Scenario tests using `app/data/example-*.json`.
3. Documentation updates:
   - Data contracts and extension guidance.
   - Export limitations and supported targets.
4. Changelog and versioning discipline.

### Deliverables
- Test-backed core flows.
- Updated docs reflecting implemented behavior.

## Suggested implementation order by file area

1. `app/scripts/config.js`, `app/scripts/store.js`, `app/scripts/utils/validation.js`
2. `shared/schemas/*.schema.json` alignment and validation harness
3. `app/scripts/views/*.js` with minimal form/edit flows
4. `app/scripts/engines/*.js` orchestration integration
5. `app/scripts/export/risa-export.js` + export engine wiring
6. `app/scripts/components/*.js` and style polish
7. Documentation and test expansion

## Definition of done for first functional milestone

A milestone is considered complete when:
1. A user can enter or load core entities (design basis, train, geometry, load cases).
2. All entities are schema-validated before computation.
3. At least one engine pipeline run produces derived grouped output.
4. Export JSON is generated and passes `risa-export.schema.json` checks.
5. Basic audit view shows validation and pipeline run history.
