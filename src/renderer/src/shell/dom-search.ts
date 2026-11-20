import type { SearchResult } from '../../../shared/types'

/** Turkish-aware case fold that keeps string length, so match offsets map back to the original text. */
export function foldTr(s: string): string {
  let out = ''
  for (const ch of s) {
    const l = ch.toLocaleLowerCase('tr')
    out += l.length === ch.length ? l : ch
  }
  return out.replace(/ı/g, 'i')
}

export function findMatches(text: string, query: string): number[] {
  const q = foldTr(query)
  if (!q) return []
  const t = foldTr(text)
  const out: number[] = []
  for (let i = t.indexOf(q); i >= 0; i = t.indexOf(q, i + q.length)) out.push(i)
  return out
}

export type DomSearch = { search(query: string, dir: 1 | -1): SearchResult; clear(): void }

/** Search over the text of a rendered DOM tree, painted with the CSS Custom Highlight API. */
export function createDomSearch(root: HTMLElement): DomSearch {
  let query = ''
  let ranges: Range[] = []
  let index = 0

  function collect(q: string): void {
    const nodes: Text[] = []
    const starts: number[] = []
    let text = ''
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT)
    for (let n = walker.nextNode(); n; n = walker.nextNode()) {
      const tag = n.parentElement?.tagName
      if (tag === 'SCRIPT' || tag === 'STYLE') continue
      nodes.push(n as Text)
      starts.push(text.length)
      text += n.nodeValue ?? ''
    }
    const locate = (offset: number): [Text, number] => {
      let i = starts.length - 1
      while (i > 0 && starts[i] > offset) i--
      return [nodes[i], offset - starts[i]]
    }
    ranges = findMatches(text, q).map((start) => {
      const r = document.createRange()
      r.setStart(...locate(start))
      // The end is located from its last character so it never lands at the start of the next node.
      const [endNode, endOffset] = locate(start + q.length - 1)
      r.setEnd(endNode, endOffset + 1)
      return r
    })
  }

  function paint(): void {
    const css = globalThis.CSS as (typeof CSS & { highlights?: Map<string, unknown> }) | undefined
    if (!css?.highlights || typeof Highlight === 'undefined') return
    css.highlights.set('search', new Highlight(...ranges))
    const current = ranges[index]
    if (current) {
      css.highlights.set('search-current', new Highlight(current))
      current.startContainer.parentElement?.scrollIntoView({ block: 'center', inline: 'nearest' })
    } else {
      css.highlights.delete('search-current')
    }
  }

  return {
    search(q, dir) {
      if (q !== query) {
        query = q
        collect(q)
        index = 0
      } else if (ranges.length) {
        index = (index + dir + ranges.length) % ranges.length
      }
      paint()
      return { index: 0 + (ranges.length ? index : 0), total: ranges.length }
    },
    clear() {
      query = ''
      ranges = []
      const css = globalThis.CSS as (typeof CSS & { highlights?: Map<string, unknown> }) | undefined
      css?.highlights?.delete('search')
      css?.highlights?.delete('search-current')
    }
  }
}
