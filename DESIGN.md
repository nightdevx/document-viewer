---
name: Document Viewer
description: A drafting table for documents. Graphite rails at the edges, the white sheet on the table, one pencil-orange accent.
colors:
  rail: "oklch(0.29 0.005 255)"
  rail-raised: "oklch(0.36 0.005 255)"
  rail-sunken: "oklch(0.22 0.005 255)"
  rail-line: "oklch(0.42 0.005 255)"
  rail-ink: "oklch(0.96 0.004 255)"
  rail-ink-muted: "oklch(0.78 0.005 255)"
  table: "oklch(0.885 0.005 255)"
  table-ink: "oklch(0.27 0.005 255)"
  table-ink-muted: "oklch(0.42 0.005 255)"
  table-line: "oklch(0.74 0.005 255)"
  sheet: "oklch(0.995 0 0)"
  paper: "oklch(0.985 0.002 255)"
  paper-ink: "oklch(0.25 0.01 255)"
  paper-ink-faint: "oklch(0.58 0.01 255)"
  paper-line: "oklch(0.9 0.004 255)"
  pencil: "oklch(0.72 0.165 55)"
  pencil-strong: "oklch(0.64 0.17 50)"
  pencil-ink: "oklch(0.22 0.04 55)"
  pencil-text: "oklch(0.5 0.15 45)"
  highlight: "oklch(0.93 0.17 120)"
  highlight-current: "oklch(0.85 0.2 125)"
  danger: "oklch(0.58 0.19 28)"
typography:
  body:
    fontFamily: "'Segoe UI Variable Text', 'Segoe UI', system-ui, sans-serif"
    fontSize: "13px"
    fontWeight: 400
    lineHeight: 1.4
    fontFeature: "tnum"
  label:
    fontFamily: "'Segoe UI Variable Text', 'Segoe UI', system-ui, sans-serif"
    fontSize: "12px"
    fontWeight: 400
    lineHeight: 1.4
  title:
    fontFamily: "'Segoe UI Variable Text', 'Segoe UI', system-ui, sans-serif"
    fontSize: "16px"
    fontWeight: 600
    lineHeight: 1.4
  reading:
    fontFamily: "'Segoe UI Variable Text', 'Segoe UI', system-ui, sans-serif"
    fontSize: "15px"
    fontWeight: 400
    lineHeight: 1.5
  code:
    fontFamily: "'Cascadia Mono', Consolas, monospace"
    fontSize: "13px"
    fontWeight: 400
    lineHeight: 1.6
rounded:
  xs: "2px"
  sm: "4px"
  md: "6px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "12px"
  lg: "16px"
  xl: "24px"
  rail-h: "40px"
  status-h: "28px"
  target: "32px"
components:
  button-primary:
    backgroundColor: "{colors.pencil}"
    textColor: "{colors.pencil-ink}"
    rounded: "{rounded.sm}"
    padding: "0 16px"
    height: "32px"
  button-secondary:
    backgroundColor: "transparent"
    textColor: "{colors.table-ink}"
    rounded: "{rounded.sm}"
    padding: "0 16px"
    height: "32px"
  icon-button:
    backgroundColor: "transparent"
    rounded: "{rounded.sm}"
    size: "32px"
  tab:
    backgroundColor: "transparent"
    textColor: "{colors.rail-ink-muted}"
    padding: "0 4px 0 12px"
  tab-selected:
    backgroundColor: "{colors.rail-raised}"
    textColor: "{colors.rail-ink}"
  search-field:
    backgroundColor: "{colors.rail-sunken}"
    textColor: "{colors.rail-ink}"
    rounded: "{rounded.sm}"
    height: "32px"
    width: "260px"
  zoom-ruler:
    backgroundColor: "{colors.rail-sunken}"
    textColor: "{colors.rail-ink}"
    rounded: "{rounded.sm}"
    height: "32px"
    width: "112px"
  dialog:
    backgroundColor: "{colors.table}"
    textColor: "{colors.table-ink}"
    rounded: "{rounded.md}"
    padding: "20px"
---

# Design System: Document Viewer

## Overview

**Creative North Star: "The Drafting Table"**

The document lies on a quiet graphite table and the instruments sit at the edges. A 40px rail on top (tabs, search, zoom, print) and a 28px status rail on the bottom frame the sheet; everything between belongs to the document. The app is used daily in short sessions and is meant to disappear: the user opens a file, reads, searches, zooms, prints.

Colour is almost absent. The neutrals are graphite with a faint cool tint (hue 255), the sheet stays white in both themes, and a single pencil-orange accent marks only what is active or actionable. Rules are hairlines, corners are 4px, depth is one soft shadow under the sheet. The signature element is the zoom control, drawn as a short ruler whose ticks track real centimetres at the current zoom.

**Key Characteristics:**
- Two graphite rails frame a mid-grey table; the document is the brightest thing on screen.
- One accent (pencil orange) for active and actionable states; one reserved highlighter for search matches.
- Tabular numerals for all figures; native Windows UI typeface.
- 32px minimum hit targets, hairline borders, 4px radii.
- Follows the OS light or dark setting; documents stay on white sheets in both.

## Colors

Cool graphite neutrals in three families (rail, table, paper), one warm accent, one reserved highlighter, one error red. All values are OKLCH on `:root` in `src/renderer/assets/main.css`; the dark theme overrides the neutrals under `prefers-color-scheme: dark`. Values in the frontmatter are the light theme.

### Primary
- **Pencil Orange** (`pencil`): active tab underline, focus ring, text selection, primary button fill, drag-over drop target, selected spreadsheet cell and header marks.
- **Pencil Strong** (`pencil-strong`): primary button border, selected cell outline, active row and column header mark.
- **Pencil Ink** (`pencil-ink`): text on pencil fills.
- **Pencil Text** (`pencil-text`): orange used as text (Markdown links); darker in light theme for contrast, equal to `pencil` in dark theme.

### Secondary
- **Highlighter** (`highlight`, `highlight-current`): search matches and the current match, in PDF text layer and in DOM search highlights. Used nowhere else.

### Neutral
- **Rail** family (`rail`, `rail-raised`, `rail-sunken`, `rail-line`, `rail-ink`, `rail-ink-muted`): top strip and status bar. Raised for the selected tab, sunken for inset instruments (search field, ruler).
- **Table** family (`table`, `table-ink`, `table-ink-muted`, `table-line`): the surface behind documents, empty and error screens, dialogs, sheet tabs, thumbnail strip.
- **Paper** family (`paper`, `paper-ink`, `paper-ink-faint`, `paper-line`): text, code and Markdown documents, text inputs. Follows the app theme.
- **Sheet** (`sheet`): the white of notices; PDF, Word, PowerPoint and spreadsheet pages stay white in both themes.
- **Danger** (`danger`): failed-tab icon, error screen icon, notice border tint.

### Named Rules
**The One Pencil Rule.** Pencil orange appears only on active or actionable elements. It never decorates headings, backgrounds or icons at rest.

**The Reserved Highlighter Rule.** Highlighter yellow-green means "search match" and nothing else.

**The White Sheet Rule.** Rendered document pages are white in both themes; the dark theme deepens the table and rails around them, never the page.

## Typography

**UI and Reading Font:** Segoe UI Variable Text (with Segoe UI, system-ui, sans-serif)
**Code Font:** Cascadia Mono (with Consolas, monospace)

**Character:** The platform's own UI face, so the shell feels native and recedes. Documents bring their own fonts; the shell never styles inside them except for text, code and Markdown documents.

### Hierarchy
- **Body** (400, 13px, 1.4): all shell text, tabs, search, buttons (buttons 600).
- **Label** (400, 12px): status bar, key caps, thumbnail numbers, spreadsheet headers.
- **Title** (600, 16px): error and unsupported screen heading; dialog heading is 15px, 600.
- **Reading** (400, 15px): Markdown body, max width 860px.
- **Code** (400, 13px, 1.6): code documents with a line-number gutter.

### Named Rules
**The Tabular Rule.** Tabular numerals are on at the body level so every figure (zoom %, position, page size, counts) aligns and does not jitter.

## Layout

Page-sized grid: `grid-template-rows: 40px 1fr 28px`. The top rail holds tabs on the left (120 to 220px each, Open button after the last), instruments on the right (search 260px, ruler 112px, print). The middle row is the table; every viewer fills it absolutely and scrolls inside. PowerPoint adds a 196px thumbnail column.

Spacing is a 4px base: 4, 8, 12, 16, 24 are the recurring steps. Documents sit 24px from the top of the table and 16 to 20px apart. All interactive controls are at least 32px square. The empty state is a dashed A4-proportion outline (280px wide) centred on the table. Print hides all chrome and prints only the document.

## Elevation & Depth

Tonal layering plus one shadow. Rails and table are flat and separated by hairline borders; only the things that float over the table (document pages, notice, dialog) carry the shadow.

### Shadow Vocabulary
- **Sheet shadow** (`box-shadow: 0 1px 2px oklch(0.2 0.01 255 / 0.18), 0 6px 18px oklch(0.2 0.01 255 / 0.14)`): pages, slides, notice, dialog. Deeper in dark theme (`0 1px 2px oklch(0 0 0 / 0.4), 0 8px 22px oklch(0 0 0 / 0.35)`).

### Named Rules
**The Lift-Only-The-Page Rule.** Chrome stays flat; the shadow belongs to the sheet and to transient overlays.

## Shapes

Square-ish: 4px radius on buttons, fields, tabs, icon buttons and the ruler; 6px on the dialog; 2px on the empty-state sheet outline; 3px on key caps. Separation is by 1px hairlines in the rail or table line colour. Selection indicators are 2px bars or outlines (tab underline, focus ring, current thumbnail, selected cell). Icons are 16px line SVGs; 36 to 40px at 1.25 stroke on empty and error screens.

## Components

### Buttons
- **Shape:** 4px radius, 32px tall, 16px side padding, weight 600.
- **Primary:** pencil fill, pencil-strong border, pencil-ink text; hover lightens 12% toward white. One per screen (Open file).
- **Secondary:** transparent, table-line border; hover tints 8% of table ink.
- **Link button:** underlined, muted ink, 3px underline offset, 32px minimum height.
- **Icon button:** 32px square, transparent; hover 14% and active 22% of current text colour; disabled at 40% opacity.
- **Focus:** 2px pencil outline, 1px offset, on every focusable element.

### Inputs / Fields
- **Search:** 260px by 32px, rail-sunken fill, rail-line border, 4px radius; border turns pencil on focus-within. Match count sits inside at the right; the zero-match state uses a soft red.
- **Text input** (dialogs): 32px, paper fill, table-line border.

### Navigation
- **Tabs:** transparent on the rail, muted ink; hover mixes toward raised; selected is raised with ink text and a 2px pencil underline. Right hairline between tabs, close button at 70% opacity. Failed tabs tint the icon danger.
- **Sheet and slide navigation:** spreadsheet tabs on the table colour with a 2px pencil bar above the selected one; PowerPoint thumbnails outline the current slide in pencil.

### Zoom Ruler (signature)
A 112px by 32px sunken instrument: a top rule, full ticks every real centimetre (`--cm`, set from the current zoom), half ticks between, and the zoom percentage in bold at the bottom centre. Clicking resets or opens the zoom choice.

### Dialog and Notice
- **Dialog:** table fill, table-line border, 6px radius, sheet shadow, 20px padding, actions right-aligned with an 8px gap.
- **Notice:** floating strip at the top of the table, sheet fill, danger-tinted border, sheet shadow.

### Status Bar
28px rail, 12px muted ink, position on the left (for example 12 / 340) and page size or sheet or slide info on the right.

## Do's and Don'ts

### Do:
- **Do** keep the document the brightest, largest thing on screen; chrome stays graphite.
- **Do** spend pencil orange only on active tab, focus, selection, primary action and drop target.
- **Do** keep every control at least 32px square.
- **Do** add new colours as OKLCH custom properties on `:root` with a dark override, not as literals in components.
- **Do** show figures in tabular numerals.
- **Do** follow the OS theme and keep rendered pages white.

### Don't:
- **Don't** use a generic grey toolbar with a blue accent.
- **Don't** use highlighter yellow-green for anything but search matches.
- **Don't** add a second accent colour, gradients, or decorative ornament to the shell.
- **Don't** put shadows on rails, tabs, buttons or fields.
- **Don't** exceed 4px radii on controls.
