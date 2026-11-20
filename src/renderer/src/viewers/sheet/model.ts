import ExcelJS from 'exceljs'
import * as XLSX from 'xlsx'
import { decodeText } from '../text-decode'
import { colWidthPx, formatCell, rowHeightPx, type CellValue } from './format'

export type BorderEdge = { style: string; color?: string }
export type CellStyle = {
  font?: { name?: string; size?: number; bold?: boolean; italic?: boolean; underline?: boolean; strike?: boolean; color?: string }
  fill?: string
  border?: Partial<Record<'top' | 'right' | 'bottom' | 'left', BorderEdge>>
  hAlign?: string
  vAlign?: string
  wrap?: boolean
  indent?: number
}
/** `style` indexes WorkbookModel.styles; 0 is the empty default style. */
export type Cell = { text: string; style: number; isNumber: boolean }
export type SheetImage = { r: number; c: number; dx: number; dy: number; w: number; h: number; mime: string; data: ArrayBuffer }
export type Merge = { r1: number; c1: number; r2: number; c2: number }
export type SheetModel = {
  name: string
  hidden: boolean
  rowCount: number
  colCount: number
  /** pixels, one entry per row / column up to rowCount / colCount */
  colWidths: number[]
  rowHeights: number[]
  hiddenRows: number[]
  hiddenCols: number[]
  frozen: { rows: number; cols: number }
  merges: Merge[]
  /** key "row,col", 0-based */
  cells: Map<string, Cell>
  images: SheetImage[]
}
export type WorkbookModel = { sheets: SheetModel[]; styles: CellStyle[]; activeSheet: number }

// ---------- colours ----------

const OFFICE_THEME = ['#FFFFFF', '#000000', '#E7E6E6', '#44546A', '#4472C4', '#ED7D31', '#A5A5A5', '#FFC000', '#5B9BD5', '#70AD47', '#0563C1', '#954F72']

// Legacy 64-colour palette used by `indexed` colours.
// prettier-ignore
const INDEXED = ['000000','FFFFFF','FF0000','00FF00','0000FF','FFFF00','FF00FF','00FFFF','000000','FFFFFF','FF0000','00FF00','0000FF','FFFF00','FF00FF','00FFFF','800000','008000','000080','808000','800080','008080','C0C0C0','808080','9999FF','993366','FFFFCC','CCFFFF','660066','FF8080','0066CC','CCCCFF','000080','FF00FF','FFFF00','00FFFF','800080','800000','008080','0000FF','00CCFF','CCFFFF','CCFFCC','FFFF99','99CCFF','FF99CC','CC99FF','FFCC99','3366FF','33CCCC','99CC00','FFCC00','FF9900','FF6600','666699','969696','003366','339966','003300','333300','993300','993366','333399','333333']

/** Theme colours in Excel's index order (lt1, dk1, lt2, dk2, accent1..6, hlink, folHlink). */
export function themePalette(themeXml: string | undefined): string[] {
  if (!themeXml) return OFFICE_THEME
  const found: Record<string, string> = {}
  const re = /<a:(dk1|lt1|dk2|lt2|accent[1-6]|hlink|folHlink)>\s*<a:(?:srgbClr val|sysClr [^>]*?lastClr)="([0-9A-Fa-f]{6})"/g
  for (const m of themeXml.matchAll(re)) found[m[1]] = '#' + m[2].toUpperCase()
  const order = ['lt1', 'dk1', 'lt2', 'dk2', 'accent1', 'accent2', 'accent3', 'accent4', 'accent5', 'accent6', 'hlink', 'folHlink']
  return order.map((k, i) => found[k] ?? OFFICE_THEME[i])
}

/** Excel tint: negative darkens, positive lightens, applied to HSL lightness. */
export function applyTint(hex: string, tint: number): string {
  if (!tint) return hex.toUpperCase()
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  let l = (max + min) / 2
  const d = max - min
  const s = d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1))
  let h = 0
  if (d) {
    if (max === r) h = ((g - b) / d) % 6
    else if (max === g) h = (b - r) / d + 2
    else h = (r - g) / d + 4
    h *= 60
  }
  l = tint < 0 ? l * (1 + tint) : l * (1 - tint) + tint
  const c = (1 - Math.abs(2 * l - 1)) * s
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1))
  const m = l - c / 2
  const [r1, g1, b1] = h < 60 ? [c, x, 0] : h < 120 ? [x, c, 0] : h < 180 ? [0, c, x] : h < 240 ? [0, x, c] : h < 300 ? [x, 0, c] : [c, 0, x]
  return '#' + [r1, g1, b1].map((v) => Math.round((v + m) * 255).toString(16).padStart(2, '0')).join('').toUpperCase()
}

type XColor = { argb?: string; theme?: number; tint?: number; indexed?: number }

function toHex(c: XColor | undefined, theme: string[]): string | undefined {
  if (!c) return undefined
  if (c.argb) return '#' + c.argb.slice(-6).toUpperCase()
  if (c.theme !== undefined) return applyTint(theme[c.theme] ?? '#000000', c.tint ?? 0)
  if (c.indexed !== undefined && c.indexed < INDEXED.length) return '#' + INDEXED[c.indexed]
  return undefined
}

// ---------- shared helpers ----------

class StyleTable {
  styles: CellStyle[] = [{}]
  private index = new Map<string, number>([['{}', 0]])
  add(style: CellStyle): number {
    const key = JSON.stringify(style)
    let i = this.index.get(key)
    if (i === undefined) {
      i = this.styles.length
      this.styles.push(style)
      this.index.set(key, i)
    }
    return i
  }
}

function emptySheet(name: string, hidden: boolean): SheetModel {
  return {
    name,
    hidden,
    rowCount: 0,
    colCount: 0,
    colWidths: [],
    rowHeights: [],
    hiddenRows: [],
    hiddenCols: [],
    frozen: { rows: 0, cols: 0 },
    merges: [],
    cells: new Map(),
    images: []
  }
}

const decodeRange = (ref: string): Merge => {
  const r = XLSX.utils.decode_range(ref)
  return { r1: r.s.r, c1: r.s.c, r2: r.e.r, c2: r.e.c }
}

// ---------- xlsx through exceljs ----------

function cellValue(cell: ExcelJS.Cell): CellValue {
  const v = cell.value as unknown
  if (v === null || v === undefined) return null
  if (typeof v !== 'object' || v instanceof Date) return v as CellValue
  const o = v as Record<string, unknown>
  if ('richText' in o) return (o.richText as { text: string }[]).map((t) => t.text).join('')
  if ('formula' in o || 'sharedFormula' in o) {
    const r = o.result as unknown
    if (r && typeof r === 'object' && !(r instanceof Date)) return (r as { error?: string }).error ?? ''
    return (r ?? null) as CellValue
  }
  if ('error' in o) return String(o.error)
  if ('text' in o) return String(o.text)
  return String(v)
}

function cellStyle(cell: ExcelJS.Cell, theme: string[]): CellStyle {
  const s: CellStyle = {}
  const f = cell.font
  if (f) {
    const font: NonNullable<CellStyle['font']> = {}
    if (f.name) font.name = f.name
    if (f.size) font.size = f.size
    if (f.bold) font.bold = true
    if (f.italic) font.italic = true
    if (f.underline) font.underline = true
    if (f.strike) font.strike = true
    const color = toHex(f.color as XColor, theme)
    if (color) font.color = color
    if (Object.keys(font).length) s.font = font
  }
  const fill = cell.fill as { type?: string; pattern?: string; fgColor?: XColor } | undefined
  if (fill?.type === 'pattern' && fill.pattern && fill.pattern !== 'none') {
    const color = toHex(fill.fgColor, theme)
    if (color) s.fill = color
  }
  const b = cell.border
  if (b) {
    const border: NonNullable<CellStyle['border']> = {}
    for (const side of ['top', 'right', 'bottom', 'left'] as const) {
      const e = b[side]
      if (e?.style) border[side] = { style: e.style, color: toHex(e.color as XColor, theme) ?? '#000000' }
    }
    if (Object.keys(border).length) s.border = border
  }
  const a = cell.alignment
  if (a?.horizontal) s.hAlign = a.horizontal
  if (a?.vertical) s.vAlign = a.vertical
  if (a?.wrapText) s.wrap = true
  if (a?.indent) s.indent = a.indent
  return s
}

async function fromExcelJS(data: ArrayBuffer, locale: string): Promise<WorkbookModel> {
  const wb = new ExcelJS.Workbook()
  await wb.xlsx.load(data)
  const theme = themePalette((wb as unknown as { _themes?: Record<string, string> })._themes?.theme1)
  const table = new StyleTable()
  const sheets: SheetModel[] = []

  for (const ws of wb.worksheets) {
    const sheet = emptySheet(ws.name, ws.state !== 'visible' && ws.state !== undefined)
    const defaultCol = colWidthPx(ws.properties.defaultColWidth ?? 8.43)
    const defaultRow = rowHeightPx(ws.properties.defaultRowHeight ?? 15)
    sheet.rowCount = ws.rowCount
    sheet.colCount = ws.columnCount

    ws.eachRow({ includeEmpty: true }, (row, rowNumber) => {
      const r = rowNumber - 1
      if (row.hidden) sheet.hiddenRows.push(r)
      if (row.height) sheet.rowHeights[r] = rowHeightPx(row.height)
      row.eachCell({ includeEmpty: false }, (cell, colNumber) => {
        const value = cellValue(cell)
        const style = table.add(cellStyle(cell, theme))
        if (value === null && style === 0) return
        sheet.cells.set(`${r},${colNumber - 1}`, {
          text: formatCell(value, cell.numFmt, locale),
          style,
          isNumber: typeof value === 'number' || value instanceof Date
        })
      })
    })
    for (let r = 0; r < sheet.rowCount; r++) sheet.rowHeights[r] ??= defaultRow
    for (let c = 0; c < sheet.colCount; c++) {
      const col = ws.getColumn(c + 1)
      sheet.colWidths[c] = col.width ? colWidthPx(col.width) : defaultCol
      if (col.hidden) sheet.hiddenCols.push(c)
    }

    sheet.merges = ((ws.model as { merges?: string[] }).merges ?? []).map(decodeRange)
    const view = ws.views?.[0] as { state?: string; xSplit?: number; ySplit?: number } | undefined
    if (view?.state === 'frozen') sheet.frozen = { rows: view.ySplit ?? 0, cols: view.xSplit ?? 0 }

    const colLeft = (c: number): number => sheet.colWidths.slice(0, c).reduce((a, b) => a + b, 0)
    const rowTop = (r: number): number => sheet.rowHeights.slice(0, r).reduce((a, b) => a + b, 0)
    for (const image of ws.getImages()) {
      const media = wb.getImage(Number(image.imageId)) as { buffer?: ArrayBuffer | Uint8Array; extension?: string }
      if (!media?.buffer) continue
      const range = image.range as unknown as {
        tl: { nativeCol: number; nativeRow: number; nativeColOff?: number; nativeRowOff?: number }
        br?: { nativeCol: number; nativeRow: number; nativeColOff?: number; nativeRowOff?: number }
        ext?: { width: number; height: number }
      }
      const { tl, br, ext } = range
      const dx = (tl.nativeColOff ?? 0) / 9525
      const dy = (tl.nativeRowOff ?? 0) / 9525
      let w = ext?.width ?? 0
      let h = ext?.height ?? 0
      if (!ext && br) {
        w = colLeft(br.nativeCol) + (br.nativeColOff ?? 0) / 9525 - colLeft(tl.nativeCol) - dx
        h = rowTop(br.nativeRow) + (br.nativeRowOff ?? 0) / 9525 - rowTop(tl.nativeRow) - dy
      }
      const bytes = media.buffer instanceof Uint8Array ? media.buffer : new Uint8Array(media.buffer)
      sheet.images.push({
        r: tl.nativeRow,
        c: tl.nativeCol,
        dx,
        dy,
        w,
        h,
        mime: `image/${media.extension === 'jpg' ? 'jpeg' : (media.extension ?? 'png')}`,
        data: bytes.slice().buffer
      })
    }
    sheets.push(sheet)
  }
  const active = (wb.views?.[0] as { activeTab?: number } | undefined)?.activeTab ?? 0
  return { sheets, styles: table.styles, activeSheet: active }
}

/** CSV text that reads as a number in either locale, so it right-aligns like Excel would show it. */
const NUMERIC_TEXT = /^[-+]?\d{1,3}(?:([.,])\d{3}(?:\1\d{3})*)?(?:[.,]\d+)?%?$|^[-+]?\d+(?:[.,]\d+)?%?$/

// ---------- xls and csv through SheetJS (values only, no styles in the community build) ----------

function fromSheetJS(wb: XLSX.WorkBook, locale: string): WorkbookModel {
  const sheets = wb.SheetNames.map((name, i) => {
    const ws = wb.Sheets[name]
    const sheet = emptySheet(name, !!wb.Workbook?.Sheets?.[i]?.Hidden)
    if (ws['!ref']) {
      const range = XLSX.utils.decode_range(ws['!ref'])
      sheet.rowCount = range.e.r + 1
      sheet.colCount = range.e.c + 1
      for (let r = range.s.r; r <= range.e.r; r++) {
        for (let c = range.s.c; c <= range.e.c; c++) {
          const cell = ws[XLSX.utils.encode_cell({ r, c })] as XLSX.CellObject | undefined
          if (!cell || cell.v === undefined) continue
          const value = cell.t === 'e' ? (cell.w ?? '#HATA') : (cell.v as CellValue)
          sheet.cells.set(`${r},${c}`, {
            text: formatCell(value, String(cell.z ?? 'General'), locale),
            style: 0,
            isNumber: cell.t === 'n' || cell.t === 'd' || (cell.t === 's' && NUMERIC_TEXT.test(String(cell.v)))
          })
        }
      }
    }
    const cols = ws['!cols'] ?? []
    const rows = ws['!rows'] ?? []
    for (let c = 0; c < sheet.colCount; c++) {
      const col = cols[c]
      sheet.colWidths[c] = col?.wpx ?? (col?.wch ? colWidthPx(col.wch) : 64)
      if (col?.hidden) sheet.hiddenCols.push(c)
    }
    for (let r = 0; r < sheet.rowCount; r++) {
      const row = rows[r]
      sheet.rowHeights[r] = row?.hpx ?? (row?.hpt ? rowHeightPx(row.hpt) : 20)
      if (row?.hidden) sheet.hiddenRows.push(r)
    }
    sheet.merges = (ws['!merges'] ?? []).map((m) => ({ r1: m.s.r, c1: m.s.c, r2: m.e.r, c2: m.e.c }))
    return sheet
  })
  return { sheets, styles: [{}], activeSheet: 0 }
}

export async function parseWorkbook(data: ArrayBuffer, ext: 'xlsx' | 'xls' | 'csv', locale: string): Promise<WorkbookModel> {
  if (ext === 'xlsx') return fromExcelJS(data, locale)
  // raw: CSV cells keep their text (12,5 / 06100 / 03/04/2026) instead of SheetJS's US-locale guesses.
  if (ext === 'csv') return fromSheetJS(XLSX.read(decodeText(data), { type: 'string', raw: true }), locale)
  return fromSheetJS(XLSX.read(new Uint8Array(data), { type: 'array', cellDates: true }), locale)
}
