// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest'
import { createDomSearch, findMatches, foldTr } from './dom-search'

describe('foldTr', () => {
  it('folds Turkish dotted and dotless i to the same letter without changing length', () => {
    expect(foldTr('İstanbul ISPARTA ışık')).toBe('istanbul isparta işik')
    expect(foldTr('İstanbul ISPARTA ışık')).toHaveLength('İstanbul ISPARTA ışık'.length)
  })
})

describe('findMatches', () => {
  it('finds case-insensitive Turkish matches', () => {
    expect(findMatches('İstanbul ve istanbul', 'İSTANBUL')).toEqual([0, 12])
  })

  it('returns nothing for an empty query', () => {
    expect(findMatches('abc', '')).toEqual([])
  })
})

describe('createDomSearch', () => {
  it('counts matches across element boundaries and cycles through them', () => {
    const root = document.createElement('div')
    root.innerHTML = '<p>İstanbul</p><p>ist<b>anbul</b> ve Ankara</p>'
    const s = createDomSearch(root)
    expect(s.search('istanbul', 1)).toEqual({ index: 0, total: 2 })
    expect(s.search('istanbul', 1)).toEqual({ index: 1, total: 2 })
    expect(s.search('istanbul', 1)).toEqual({ index: 0, total: 2 })
    expect(s.search('istanbul', -1)).toEqual({ index: 1, total: 2 })
  })

  it('a new query starts from the first match', () => {
    const root = document.createElement('div')
    root.innerHTML = '<p>a b a</p>'
    const s = createDomSearch(root)
    s.search('a', 1)
    s.search('a', 1)
    expect(s.search('b', 1)).toEqual({ index: 0, total: 1 })
  })

  it('reports zero for no match', () => {
    const root = document.createElement('div')
    root.textContent = 'merhaba'
    expect(createDomSearch(root).search('yok', 1)).toEqual({ index: 0, total: 0 })
  })
})
