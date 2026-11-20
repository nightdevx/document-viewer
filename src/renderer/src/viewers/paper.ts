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
