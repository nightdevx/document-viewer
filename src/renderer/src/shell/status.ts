export type ViewerStatus = { position?: string; info?: string }

/** Viewers report what the status bar shows (e.g. "12 / 340", "A4 · 21 × 29,7 cm"). */
export function emitStatus(host: HTMLElement, status: ViewerStatus): void {
  host.dataset.position = status.position ?? ''
  host.dataset.info = status.info ?? ''
  host.dispatchEvent(new CustomEvent('viewer-status', { bubbles: true }))
}
