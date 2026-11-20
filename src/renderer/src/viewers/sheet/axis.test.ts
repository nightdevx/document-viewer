import { describe, expect, it } from 'vitest'
import { buildAxis, indexAt, searchCells } from './axis'

describe('buildAxis', () => {
  it('accumulates sizes and gives hidden entries zero size', () => {
    const a = buildAxis([10, 20, 30, 40], [1], 4)
    expect([...a.starts]).toEqual([0, 10, 10, 40, 80])
    expect(a.total).toBe(80)
    expect(a.size(1)).toBe(0)
    expect(a.size(2)).toBe(30)
  })

  it('uses the default size beyond the given sizes', () => {
    const a = buildAxis([10], [], 3, 5)
    expect(a.total).toBe(20)
  })
})

describe('indexAt', () => {
  const a = buildAxis([10, 20, 30, 40], [1], 4)
  it('finds the visible entry covering a position', () => {
    expect(indexAt(a, 0)).toBe(0)
    expect(indexAt(a, 9.5)).toBe(0)
    expect(indexAt(a, 10)).toBe(2)
    expect(indexAt(a, 45)).toBe(3)
  })

  it('clamps outside the range', () => {
    expect(indexAt(a, -5)).toBe(0)
    expect(indexAt(a, 999)).toBe(3)
  })
})

describe('searchCells', () => {
  it('returns matching cells in reading order, Turkish case-insensitive', () => {
    const cells = new Map([
      ['2,0', { text: 'İstanbul' }],
      ['0,1', { text: 'istanbul şubesi' }],
      ['0,0', { text: 'Ankara' }],
      ['10,2', { text: 'ISTANBUL' }]
    ])
    expect(searchCells(cells, 'istanbul')).toEqual([
      [0, 1],
      [2, 0],
      [10, 2]
    ])
  })

  it('skips hidden rows and columns', () => {
    const cells = new Map([
      ['1,0', { text: 'x' }],
      ['2,3', { text: 'x' }],
      ['3,0', { text: 'x' }]
    ])
    expect(searchCells(cells, 'x', new Set([1]), new Set([3]))).toEqual([[3, 0]])
  })
})
