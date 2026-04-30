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

## Accessibility and Readability
- Preserve sufficient contrast for text, borders, status pills, and error states.
- Ensure keyboard navigability for future interactive controls.
- Never communicate critical status by color alone; include text labels.

## Dashboard Layout Rules
- Use consistent spacing rhythm across cards and summary lists.
- Prefer responsive grid key-value layouts for metadata blocks.
- Keep domain panels ordered by workflow dependency (project → governing basis → inputs → generation).
