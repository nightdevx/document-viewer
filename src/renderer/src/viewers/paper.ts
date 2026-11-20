const PAPERS: [string, number, number][] = [
  ['A3', 29.7, 42],
  ['A4', 21, 29.7],
  ['A5', 14.8, 21],
  ['Letter', 21.59, 27.94],
  ['Legal', 21.59, 35.56]
]

const cm = (n: number): string => (Math.round(n * 10) / 10).toLocaleString('tr-TR')

/** Status-bar text for a page of the given size in PDF points (1/72 inch). */
export function describePage(widthPt: number, heightPt: number): string {
  const w = (widthPt / 72) * 2.54
  const h = (heightPt / 72) * 2.54
  const size = `${cm(w)} × ${cm(h)} cm`
  const [short, long] = w < h ? [w, h] : [h, w]
  const paper = PAPERS.find(([, pw, ph]) => Math.abs(pw - short) < 0.2 && Math.abs(ph - long) < 0.2)
  if (!paper) return size
  return `${paper[0]}${w > h ? ' yatay' : ''} · ${size}`
}

const RATIOS: [string, number][] = [
  ['16:9', 16 / 9],
  ['16:10', 16 / 10],
  ['4:3', 4 / 3]
]

/** Status-bar text for a slide size in EMU (360 000 per cm), e.g. "16:9 · 33,9 × 19,1 cm". */
export function describeSlide(cx: number, cy: number): string {
  const size = `${cm(cx / 360_000)} × ${cm(cy / 360_000)} cm`
  const ratio = RATIOS.find(([, r]) => Math.abs(cx / cy - r) < 0.01)
  return ratio ? `${ratio[0]} · ${size}` : size
}
