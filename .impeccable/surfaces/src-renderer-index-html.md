---
version: 1
slug: "src-renderer-index-html"
primary_target: "src/renderer/index.html"
related_targets: []
---

## Scope

App shell of the document viewer (tab strip, toolbar, status bar, empty/error/large-file/unsupported screens) around every viewer. Mode: Operate.

## Task

Open documents from Explorer or the Open dialog, switch tabs, zoom, search in the active document, print. Used daily, in short sessions. Constraints from the user: one thin always-visible strip, document fills the rest; no excess colour or ornament; must not feel generic; controls must be easy to hit (min 32px targets).

## Direction contract

THESIS: The viewer is a drafting table: the document lies on a quiet graphite surface and the instruments sit at the edge. It refuses the generic grey toolbar with a blue accent.

OWN-WORLD: Graphite neutrals (warm-cool grey ground, darker strip), white sheet with soft shadow; one pencil-orange accent used only on actionable/active elements (active tab underline, focus ring, primary button); a reserved highlighter yellow-green used only for search matches. Segoe UI Variable for UI text, tabular numerals for every figure. Hairline rules, square-ish 4px radii. Dark theme: graphite deepens, sheet stays white for documents.

STORY: The user double-clicks a file, the sheet appears on the table, they read, search, zoom, switch, print; they never think about the app.

FIRST VIEWPORT: Top strip 40px: tabs left (file-type glyph, name, close), Open (+) at the end of tabs; right: search field, zoom control drawn as a short ruler segment with ticks and the % value, print. Below: the document on the graphite table. Bottom status bar 28px: position (12 / 340), page size in cm (A4 · 21 × 29,7 cm) or sheet/slide info.

FORM: Drafting table and graph-paper ruler, candidate 7 of 7. seed:127f387d91e751b2. Signature move: zoom control as a ruler whose ticks track real centimetres at the current zoom. Raises from declined challengers: accent reserved strictly for actionable elements (warm consumer app); one reserved highlight colour for search matches, used nowhere else (orienteering course purple); tabular monospaced figures for all numbers (datamatics); position always legible in the status bar (terminal wayfinding).

FINISH: unreviewed and undocumented is unfinished; critique, polish, audit and the finish reviewer run before the UI is called done, and DESIGN.md is written from the built world.
