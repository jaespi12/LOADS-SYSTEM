# LOADS-SYSTEM Architecture Map

## Purpose
This document maps the current repository layout to responsibilities and runtime behavior. It is based on files that exist today and avoids speculative engineering formulas.

## Top-level structure

- `index.html`
  - Browser entry document.
  - Loads shared and app CSS.
  - Mount point for app runtime (`#app-root`) and version badge (`#app-version`).
  - Boots JavaScript via `app/scripts/app.js`.

- `app/`
  - Frontend application code and app-scoped styles.

- `shared/`
  - Cross-cutting static assets: lookup data, schemas, nav metadata, and base styles.

- `docs/`
  - Product and engineering documentation.

- `prompts/`
  - Authoring/review prompt templates.

## Folder-to-responsibility map

## 1) `shared/data/` (reference datasets)
Current files:
- `code-sets.json`
- `unit-systems.json`
- `load-family-types.json`
- `ride-states.json`
- `export-targets.json`
- `status-options.json`

Responsibility:
- Provide controlled vocabularies and basic lookup tables used by UI and future engines.
- Keep display labels and stable IDs in one place.

Runtime role today:
- Loaded in parallel by `app/scripts/app.js` `bootstrap()`.
- Stored under `state.lookups` in `app/scripts/store.js`.
- Rendered as a loaded-dataset list in the shell.

## 2) `shared/schemas/` (contract layer)
Current files:
- `design-basis.schema.json`
- `train-section.schema.json`
- `geometry-station.schema.json`
- `load-case.schema.json`
- `grouped-case.schema.json`
- `risa-export.schema.json`

Responsibility:
- Define expected object shapes and required fields for core domain entities.
- Provide a validation contract between data capture, processing engines, and export adapters.

Runtime role today:
- Not yet actively executed by a validator in app runtime.
- Serve as source-of-truth structure for future validation and model evolution.

## 3) `app/scripts/` (application runtime)
Current key files:
- `config.js`
  - Declares app metadata (`appName`, `version`) and canonical file paths for lookup data.
- `store.js`
  - Minimal in-memory state container with `getState`, `setState`, and `subscribe`.
- `app.js`
  - Startup lifecycle:
    1. Render loading state.
    2. Fetch lookup files via configured paths.
    3. Commit lookups into shared store.
    4. Re-render success state or startup error panel.

Other present-but-not-wired modules:
- `components/`
- `views/`
- `engines/`
- `export/`
- `utils/`

These indicate planned modular growth but are not yet integrated by `app.js`.

## 4) `app/styles/` and `shared/styles/` (presentation layers)

`shared/styles/` responsibility:
- Global design tokens (`tokens.css`) and universal layout/utilities (`layout.css`, `utilities.css`).

`app/styles/` responsibility:
- App-shell styling (`app.css`) and local component/dashboard rules.

Runtime role today:
- Included in `index.html` in cascading order from shared base to app-specific layers.

## 5) `app/data/` (sample payloads)
Current files include examples for geometry, train, project, and kinematics.

Responsibility:
- Candidate fixtures for future view/engine integration, demos, and tests.

Runtime role today:
- Not yet loaded by `app.js`.

## 6) `docs/` and `prompts/`

`docs/` responsibility:
- Product context, QA/QC, data model, requirements, and change logs.

`prompts/` responsibility:
- Process templates for scaffolding, schema updates, bugfixes, and review cycles.

## Current data flow (implemented)

1. Browser loads `index.html`.
2. CSS layers are loaded (`shared/styles/*` then `app/styles/*`).
3. `app/scripts/app.js` starts.
4. `app.js` reads file paths from `APP_CONFIG` (`config.js`).
5. `bootstrap()` fetches all files in `shared/data/` listed in config.
6. Results are written to centralized in-memory `state.lookups` via `setState()`.
7. `subscribe(render)` triggers UI update to show loaded datasets.
8. If any fetch fails, error state is rendered.

## Expected end-to-end data flow (target based on existing structure)

This extends from what is present in the repo; it does not define engineering equations.

1. **Reference loading**
   - Load `shared/data/*` catalogs for dropdowns, options, and status controls.

2. **User/project input capture**
   - Views under `app/scripts/views/` capture design basis, train, geometry, and load definitions.

3. **Validation boundary**
   - Validate user-entered objects against `shared/schemas/*` prior to processing.
   - Validation errors are surfaced in view state and audit views.

4. **Computation/transform stage**
   - Domain engines under `app/scripts/engines/` transform validated inputs into derived cases/groups/envelopes/kinematics representations.

5. **State aggregation**
   - Store normalized entities and derived outputs in `store.js` (or an expanded store architecture).

6. **Export preparation**
   - Export module(s), especially `app/scripts/export/risa-export.js` and `engines/export-engine.js`, map internal state to external contract shapes.

7. **Schema-conformant output**
   - Serialize export package aligned with `shared/schemas/risa-export.schema.json` and target-specific requirements from `shared/data/export-targets.json`.

## Integration seams to preserve

- Keep `config.js` as single source of path and environment constants.
- Keep schemas decoupled from UI code so they can validate both imported data and generated exports.
- Keep engines pure where possible (input object -> output object), leaving side effects to orchestration layers.
- Treat `shared/data` IDs as stable keys and labels as presentation concerns.

## Known gaps (from current repo state)

- Runtime schema validation is not yet wired.
- View/component/engine modules are mostly unconnected to the app bootstrap.
- No persistence layer (local or remote) is currently defined.
- No automated tests currently enforce schema validity, store behavior, or export shape.
