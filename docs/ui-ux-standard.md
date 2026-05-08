# UI/UX Standard (Engineering Dashboard Baseline)

## Theme and Visual Intent
- Default theme is **dark** and **high-contrast**.
- Prioritize rapid readability for engineering review contexts (long sessions, dense numeric data).
- Avoid decorative motion/ornament that obscures state.

## Typography
- Use a legible sans-serif stack optimized for data dashboards.
- Maintain strong hierarchy:
  - Section title (`h2`) for domain blocks.
  - Subsection title (`h3`) for validation/summary blocks.
  - Label/value pairs (`dt`/`dd`) for compact metadata.
- Numeric values should align consistently in list/table contexts.

## Color Semantics
- `status-ok`: reserved for valid/safe/success state.
- `status-bad`: reserved for invalid/error/warning state requiring action.
- Danger/error text must use high-visibility contrast and never rely on color alone.
- Accent stripes per domain panel are allowed to improve scanability, but semantic status must still use status tokens.

## Component Rules
- All major sections render as card panels.
- Each domain card should include:
  - heading,
  - validation status pill,
  - key summary fields,
  - error list if invalid,
  - explicit placeholder when capability is not yet implemented.
- Summary lists/tables must remain concise and avoid hidden interactions in baseline mode.

## Interaction Rules
- Keep baseline interactions deterministic and inspectable.
- No implicit auto-edits; future editing modes must be explicit and reversible.
- Validation feedback must be visible in-context, near the affected domain section.
- Loading and startup errors must render as first-class cards.

## Collapsible Panel Rules
- All collapsible sections use `<details>` + `<summary>` with a `data-panel-id` attribute on the `<details>` element.
- Panel IDs must be deterministic and unique within a view (pattern: `{entity}-{index}-{panel-name}`).
- The `render()` function captures all `details[data-panel-id]` open states before `root.innerHTML` replacement and restores them after, so user collapse/expand choices survive any `setState()` call.
- The `<summary>` element renders a chevron via a `<span class="summary-chevron">›</span>` element that rotates 90° when `details[open]`. The chevron must be at least 1.25rem in font-size to provide a clear, large click affordance.
- `<summary>` elements must never contain interactive controls (inputs, buttons). Controls that affect the section go in the card header, not the summary.

## Product Language Rules (User-Facing UI)
The visible UI is written for engineering end-users, not for developers reading the schema. The following terms must never appear in user-facing labels, headings, hints, error messages, or tooltips:

| Banned (developer wording) | Use instead (product wording) |
| --- | --- |
| `BEL`, `Stengel` (vendor names in UI copy) | (no vendor reference) |
| `CoM` | Center of Mass |
| `placeholder until X` | Not yet used by calculations |
| `readiness`, `Validation & Readiness` | Checks |
| `schema invalid`, `schema errors` | (rephrased per-error in plain English) |
| `section idx`, `axle idx`, `sectionIdx`, `axleIdx` | Section / Axle (with name) |
| `participatesInLoadGen` | Used in Calculations |
| `dataSource` | Source |
| any `camelCase` or `snake_case` JSON field | Spaced, capitalized label |
| `sections[0].mass` style paths | "{section name}: mass is not yet entered." |

Schema validator output that leaks JSON paths must be passed through a humanizer (e.g. `humanizeSchemaError` in `train-view.js`) before display.

## Editable vs. Calculated Visual Distinction
Cards and summary cards must visually signal whether their values are user-editable or derived:

- **Input cards** (editable): left border `#38bdf8` (cyan), `kpi-badge-input` chip.
- **Count cards** (controlled by Add/Remove actions): left border `#a78bfa` (violet), `kpi-badge-count` chip.
- **Calculated cards** (read-only): left border `#94a3b8` (slate), faint slate background tint, `kpi-badge-calc` chip and/or `card-header-tag` reading "calculated".
- **Status cards**: left border `#facc15` (yellow).

Each card with editable inputs must include a `card-header` that pairs the heading with a short hint or action area. Each calculated card must include a `card-header-tag` reading "calculated" so the read-only intent is unambiguous.

## Calculation Usage Panel
The Train tab includes a `Calculation Usage` card that explicitly partitions inputs into three groups, each marked with a colored dot:

- **Used by calculations now** (`dot-now`, green): inputs the engine reads today.
- **Saved now, used later** (`dot-saved`, blue): inputs persisted but not yet referenced by approved formulas.
- **Not yet used by calculations** (`dot-not-yet`, slate): inputs whose engine binding is gated on formula approval.

This panel replaces previous developer-only language ("placeholder until BEL/Stengel approval") with a clear, three-way usage statement understandable without internal context.

## Accessibility and Readability
- Preserve sufficient contrast for text, borders, status pills, and error states.
- Ensure keyboard navigability for future interactive controls.
- Never communicate critical status by color alone; include text labels.

## Dashboard Layout Rules
- Use consistent spacing rhythm across cards and summary lists.
- Prefer responsive grid key-value layouts for metadata blocks.
- Keep domain panels ordered by workflow dependency (project → governing basis → inputs → generation).
