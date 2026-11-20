import { describe, expect, it } from 'vitest'
import { anchoredScroll, clampZoom, nextZoom } from './zoom'

describe('nextZoom', () => {
  it('steps through the preset levels', () => {
    expect(nextZoom(1, 1)).toBe(1.1)
    expect(nextZoom(1, -1)).toBe(0.9)
  })

  it('snaps an in-between value to the next preset in that direction', () => {
    expect(nextZoom(1.03, 1)).toBe(1.1)
    expect(nextZoom(1.03, -1)).toBe(1)
  })

  it('stops at the ends', () => {
    expect(nextZoom(5, 1)).toBe(5)
    expect(nextZoom(0.25, -1)).toBe(0.25)
  })
})

describe('anchoredScroll', () => {
  it('keeps the content point under the anchor in place when zooming in', () => {
    // point under the cursor: (100 + 200) / 1 = 300 content px; after 2x it is at 600, minus the 200 px offset
    expect(anchoredScroll(100, 200, 1, 2)).toBe(400)
  })

  it('keeps it in place when zooming out', () => {
    expect(anchoredScroll(400, 200, 2, 1)).toBe(100)
  })

  it('never scrolls before the start', () => {
    expect(anchoredScroll(0, 50, 2, 1)).toBe(0)
  })
})

describe('clampZoom', () => {
  it('keeps zoom within 0.25..5', () => {
    expect(clampZoom(0.1)).toBe(0.25)
    expect(clampZoom(9)).toBe(5)
    expect(clampZoom(1.3)).toBe(1.3)
  })
})
