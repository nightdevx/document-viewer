import { describe, expect, it } from 'vitest'
import { describePage } from './paper'

describe('describePage', () => {
  it('names A4 portrait from PDF points', () => {
    expect(describePage(595.28, 841.89)).toBe('A4 · 21 × 29,7 cm')
  })

  it('names A4 landscape', () => {
    expect(describePage(841.89, 595.28)).toBe('A4 yatay · 29,7 × 21 cm')
  })

  it('names US Letter', () => {
    expect(describePage(612, 792)).toBe('Letter · 21,6 × 27,9 cm')
  })

  it('shows only the size for other formats', () => {
    expect(describePage(720, 405)).toBe('25,4 × 14,3 cm')
  })
})
