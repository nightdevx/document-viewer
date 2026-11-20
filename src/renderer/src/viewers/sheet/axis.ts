import { findMatches } from '../../shell/dom-search'

/** Offsets along one axis (rows or columns); starts has count + 1 entries, the last is the total. */
export type Axis = { starts: Float64Array; total: number; count: number; size(i: number): number }

export function buildAxis(sizes: number[], hidden: number[], count: number, fallback = 20): Axis {
  const hide = new Set(hidden)
  const starts = new Float64Array(count + 1)
  for (let i = 0; i < count; i++) starts[i + 1] = starts[i] + (hide.has(i) ? 0 : (sizes[i] ?? fallback))
  return { starts, total: starts[count], count, size: (i) => starts[i + 1] - starts[i] }
}

/** Index of the entry covering `pos` (hidden, zero-size entries are skipped), clamped to the axis. */
export function indexAt(axis: Axis, pos: number): number {
  let lo = 0
  let hi = axis.count - 1
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1
    if (axis.starts[mid] <= pos) lo = mid
    else hi = mid - 1
  }
  return Math.max(0, lo)
}

/** Cells whose text contains the query, as [row, col] in reading order. */
export function searchCells(
  cells: Map<string, { text: string }>,
  query: string,
  hiddenRows: Set<number> = new Set(),
  hiddenCols: Set<number> = new Set()
): [number, number][] {
  const out: [number, number][] = []
  for (const [key, cell] of cells) {
    if (!findMatches(cell.text, query).length) continue
    const [r, c] = key.split(',').map(Number)
    if (!hiddenRows.has(r) && !hiddenCols.has(c)) out.push([r, c])
  }
  return out.sort((a, b) => a[0] - b[0] || a[1] - b[1])
}
