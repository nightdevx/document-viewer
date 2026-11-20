# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

(Electron desktop app on Windows 11; the UI is a web renderer.)

## Stack

Electron + TypeScript + electron-vite, no UI framework (plain DOM). Chosen with the user; see PLAN.md.

## Users

One user: the owner, on their own Windows 11 PC. They double-click documents in Explorer and expect them to open here, as the default app for PDF, Word, Excel, PowerPoint, Markdown, text and code files.

## Product Purpose

A personal, self-contained document viewer that shows every common document format faithfully, the way Office or a PDF reader would, from one app. Success: double-clicking any supported file opens it quickly in a tab and it looks right.

## Positioning

One app for all document types, with no dependency on Office, LibreOffice or any other installed program. View-only.

## Operating Context

- Opened from Explorer by double-click or "Open with"; a second file joins the running window as a new tab.
- Documents come from anywhere (downloads, email attachments, OneDrive, network shares) and are treated as untrusted.
- Typical use: read, zoom, search inside the document, switch between open files, print.

## Capabilities and Constraints

- Formats: pdf, docx, xlsx, xls, csv, pptx, md, txt, json, xml, log, common source code. .doc and .ppt show a "not supported" screen.
- View-only: zoom, search in the active document, page/slide/sheet navigation, print, tabs. No editing, annotation or export.
- Charts, SmartArt and EMF/WMF images are placeholders in the first version.
- No network access from documents; remote images are blocked and shown as placeholders.
- UI language: Turkish.

## Brand Commitments

- Working name "Document Viewer"; final name undecided.
- Owner identity: nightdijital, https://nightdijital.com, iletisim@nightdijital.com. Personal tool, so branding stays out of the way.

## Product Principles

1. The document is the interface. Chrome stays minimal and quiet around it.
2. Faithful rendering beats features.
3. Open fast, never freeze, never crash on a bad file: show a clear message instead.
4. Familiar desktop conventions (keyboard shortcuts, tabs, Windows light/dark theme) over novelty.
