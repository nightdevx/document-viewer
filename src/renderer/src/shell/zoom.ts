const LEVELS = [0.25, 0.33, 0.5, 0.67, 0.75, 0.8, 0.9, 1, 1.1, 1.25, 1.5, 1.75, 2, 2.5, 3, 4, 5]

export const clampZoom = (z: number): number => Math.min(5, Math.max(0.25, z))

/** Next preset level above (1) or below (-1) the current zoom. */
export function nextZoom(current: number, dir: 1 | -1): number {
  const found = dir === 1 ? LEVELS.find((l) => l > current + 1e-6) : [...LEVELS].reverse().find((l) => l < current - 1e-6)
  return found ?? (dir === 1 ? 5 : 0.25)
}

export type ZoomAnchor = { x: number; y: number }

/** New scroll offset that keeps the content under `offset` (px from the scroller's edge) in place. */
export const anchoredScroll = (scroll: number, offset: number, oldZ: number, newZ: number): number =>
  Math.max(0, ((scroll + offset) * newZ) / oldZ - offset)

/**
 * Zooms a scroller's CSS-zoomed content around `anchor` (client coordinates; the scroller's centre
 * when missing) so the spot under the cursor stays under the cursor.
 */
export function zoomAround(scroller: HTMLElement, content: HTMLElement, oldZ: number, newZ: number, anchor?: ZoomAnchor): void {
  const r = scroller.getBoundingClientRect()
  const ox = (anchor?.x ?? r.left + r.width / 2) - r.left
  const oy = (anchor?.y ?? r.top + r.height / 2) - r.top
  const left = anchoredScroll(scroller.scrollLeft, ox, oldZ, newZ)
  const top = anchoredScroll(scroller.scrollTop, oy, oldZ, newZ)
  content.style.zoom = String(newZ)
  scroller.scrollTo(left, top)
}
