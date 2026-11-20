import { describe, expect, it } from 'vitest'
import { colWidthPx, columnName, formatCell, rowHeightPx } from './format'

describe('formatCell', () => {
  it('formats numbers with the locale separators like Excel does', () => {
    expect(formatCell(1234.5, '#,##0.00', 'en-US')).toBe('1,234.50')
    expect(formatCell(1234.5, '#,##0.00', 'tr-TR')).toBe('1.234,50')
  })

  it('formats percentages', () => {
    expect(formatCell(0.5, '0%', 'tr-TR')).toBe('50%')
  })

  it('formats an Excel date serial with a date format without touching separators', () => {
    expect(formatCell(45000, 'dd.mm.yyyy', 'tr-TR')).toBe('15.03.2023')
  })

  it('formats a JS Date like the matching serial', () => {
    expect(formatCell(new Date(Date.UTC(2023, 2, 15)), 'dd.mm.yyyy', 'tr-TR')).toBe('15.03.2023')
  })

  it('leaves text as is', () => {
    expect(formatCell('metin', 'General', 'tr-TR')).toBe('metin')
  })

  it('shows General numbers with a locale decimal comma', () => {
    expect(formatCell(1250.5, 'General', 'tr-TR')).toBe('1250,5')
  })

  it('shows booleans as Excel does in Turkish', () => {
    expect(formatCell(true, 'General', 'tr-TR')).toBe('DOĞRU')
    expect(formatCell(false, 'General', 'en-US')).toBe('FALSE')
  })

  it('shows empty for null', () => {
    expect(formatCell(null, 'General', 'tr-TR')).toBe('')
  })
})

describe('sizes', () => {
  it('converts Excel column width (characters) to pixels', () => {
    expect(colWidthPx(8.43)).toBe(64)
  })

  it('converts row height (points) to pixels', () => {
    expect(rowHeightPx(15)).toBe(20)
  })
})

describe('columnName', () => {
  it('names columns like Excel', () => {
    expect(columnName(0)).toBe('A')
    expect(columnName(25)).toBe('Z')
    expect(columnName(26)).toBe('AA')
    expect(columnName(701)).toBe('ZZ')
    expect(columnName(702)).toBe('AAA')
  })
})
