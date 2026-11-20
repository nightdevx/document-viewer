import { SSF } from 'xlsx'

export type CellValue = number | string | boolean | Date | null

const separators = new Map<string, { group: string; decimal: string }>()

function separatorsFor(locale: string): { group: string; decimal: string } {
  let s = separators.get(locale)
  if (!s) {
    const parts = new Intl.NumberFormat(locale).formatToParts(1234.5)
    s = {
      group: parts.find((p) => p.type === 'group')?.value ?? ',',
      decimal: parts.find((p) => p.type === 'decimal')?.value ?? '.'
    }
    separators.set(locale, s)
  }
  return s
}

const toSerial = (d: Date): number => d.getTime() / 86_400_000 + 25_569

/**
 * Display text of a cell, like Excel: the format code decides the shape, and number
 * separators follow the user's locale (Turkish: 1.234,50). Date formats are left as written.
 */
export function formatCell(value: CellValue, numFmt: string, locale: string): string {
  if (value === null || value === undefined) return ''
  if (typeof value === 'boolean') {
    const tr = locale.startsWith('tr')
    return value ? (tr ? 'DOĞRU' : 'TRUE') : tr ? 'YANLIŞ' : 'FALSE'
  }
  if (typeof value === 'string') return value
  // Turkish date formats use "." between date parts (dd.mm.yyyy); SSF reads that dot as a decimal point.
  const fmt = (numFmt || 'General').replace(/(?<=[dmyDMY])\.(?=[dmyDMY])/g, '"."')
  const num = value instanceof Date ? toSerial(value) : value
  let text: string
  try {
    text = SSF.format(fmt, num)
  } catch {
    text = String(num)
  }
  if (value instanceof Date || SSF.is_date(fmt)) return text
  const { group, decimal } = separatorsFor(locale)
  if (group === ',' && decimal === '.') return text
  return text.replace(/[.,]/g, (c) => (c === ',' ? group : decimal))
}

/** Excel column width in characters to pixels (Calibri 11, max digit width 7px). */
// ponytail: assumes the default Calibri 11 font; workbooks with another default font will be slightly off.
export const colWidthPx = (w: number): number => Math.trunc(w * 7 + 5)

/** Row height in points to pixels at 96 dpi. */
export const rowHeightPx = (pt: number): number => Math.round((pt * 4) / 3)

export function columnName(i: number): string {
  let name = ''
  for (let n = i + 1; n > 0; n = Math.floor((n - 1) / 26)) name = String.fromCharCode(65 + ((n - 1) % 26)) + name
  return name
}
