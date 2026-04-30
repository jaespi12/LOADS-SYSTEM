# Change Management and Shared Asset Sync Policy

## Purpose
Define how shared contracts and copied assets are updated so repo behavior stays predictable and auditable.

## Source of Truth
- Shared catalogs and contracts:
  - `shared/data/*`
  - `shared/schemas/*`
- Governance rules:
  - `AGENTS.md` (canonical assistant rules)
  - `README.md` (project-level status and workflow)
  - `docs/ui-ux-standard.md` (UI behavior baseline)

## Update Sequence (Required)
1. Change shared source-of-truth files first (`shared/data`, `shared/schemas`).
2. Sync dependent example fixtures in `app/data`.
3. Sync runtime wiring in `app/scripts/app.js`, store, and views.
4. Sync documentation (`README.md`, `docs/*`) in the same change set.

## Copied Asset Policy
- If content is copied from shared contracts into app fixtures or view assumptions, the PR must include:
  - what was copied,
  - why it was copied,
  - where it must be re-synced when source changes.
- Avoid silent duplication of enums/IDs across files without documenting sync responsibility.

## Baseline Governance Items
- Code-set editions tracked in `shared/data/code-sets.json` must remain explicit (no vague placeholders).
- Required load-family baseline includes `SEISMIC` in addition to foundational families.
- Any change to required families or code-set editions must include README and docs updates.

## Future Sync Automation (Planned)
- Add lint/check scripts that detect drift between:
  - schema enums and lookup IDs,
  - required load families and fixture selections,
  - documented baseline lists and shared catalog entries.
- Until automation lands, maintain manual checks in PR testing notes.
