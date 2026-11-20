import ExcelJS from 'exceljs'
import * as XLSX from 'xlsx'
import { describe, expect, it } from 'vitest'
import { applyTint, parseWorkbook, themePalette } from './model'

const PNG_1x1 = Uint8Array.from(
  atob('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=='),
  (c) => c.charCodeAt(0)
)

async function sampleXlsx(): Promise<ArrayBuffer> {
  const wb = new ExcelJS.Workbook()
  const ws = wb.addWorksheet('Bütçe', { views: [{ state: 'frozen', xSplit: 1, ySplit: 1 }] })
  wb.addWorksheet('Gizli', { state: 'hidden' })
  ws.getCell('A1').value = 'Kalem'
  ws.getCell('A1').font = { bold: true, color: { argb: 'FFFF0000' }, size: 14, name: 'Arial' }
  ws.getCell('A1').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFF00' } }
  ws.getCell('A1').border = { bottom: { style: 'thin', color: { argb: 'FF000000' } } }
  ws.getCell('B1').value = 1234.5
  ws.getCell('B1').numFmt = '#,##0.00'
  ws.getCell('C1').value = new Date(Date.UTC(2023, 2, 15))
  ws.getCell('C1').numFmt = 'dd.mm.yyyy'
  ws.getCell('D1').value = { formula: 'B1*2', result: 2469 }
  ws.getCell('A2').value = { richText: [{ text: 'Zengin ' }, { text: 'metin', font: { bold: true } }] }
  ws.getCell('A2').alignment = { horizontal: 'center', vertical: 'middle', wrapText: true }
  ws.mergeCells('A3:C4')
  ws.getCell('A3').value = 'Birleşik'
  // exceljs only writes `hidden` for rows that have cells.
  ws.getCell('A5').value = 'Gizli satır'
  ws.getRow(5).hidden = true
  ws.getRow(2).height = 30
  ws.getColumn(2).width = 20
  ws.getColumn(4).hidden = true
  const img = wb.addImage({ buffer: PNG_1x1 as unknown as ExcelJS.Buffer, extension: 'png' })
  ws.addImage(img, { tl: { col: 4, row: 1 }, ext: { width: 50, height: 40 } })
  return (await wb.xlsx.writeBuffer()) as ArrayBuffer
}

describe('parseWorkbook (xlsx)', () => {
  it('reads values, formats, styles, merges, hidden rows and columns, frozen panes and images', async () => {
    const model = await parseWorkbook(await sampleXlsx(), 'xlsx', 'tr-TR')
    const sheet = model.sheets[0]
    expect(model.sheets.map((s) => [s.name, s.hidden])).toEqual([
      ['Bütçe', false],
      ['Gizli', true]
    ])
    expect(sheet.cells.get('0,0')?.text).toBe('Kalem')
    expect(sheet.cells.get('0,1')).toMatchObject({ text: '1.234,50', isNumber: true })
    expect(sheet.cells.get('0,2')?.text).toBe('15.03.2023')
    expect(sheet.cells.get('0,3')?.text).toBe('2469')
    expect(sheet.cells.get('1,0')?.text).toBe('Zengin metin')

    const a1 = model.styles[sheet.cells.get('0,0')!.style]
    expect(a1.font).toMatchObject({ bold: true, color: '#FF0000', size: 14, name: 'Arial' })
    expect(a1.fill).toBe('#FFFF00')
    expect(a1.border?.bottom).toMatchObject({ style: 'thin', color: '#000000' })
    expect(model.styles[sheet.cells.get('1,0')!.style]).toMatchObject({ hAlign: 'center', vAlign: 'middle', wrap: true })

    expect(sheet.merges).toContainEqual({ r1: 2, c1: 0, r2: 3, c2: 2 })
    expect(sheet.hiddenRows).toContain(4)
    expect(sheet.hiddenCols).toContain(3)
    expect(sheet.rowHeights[1]).toBe(40)
    expect(sheet.colWidths[1]).toBe(145)
    expect(sheet.colWidths[0]).toBe(64)
    expect(sheet.frozen).toEqual({ rows: 1, cols: 1 })
    expect(sheet.images).toHaveLength(1)
    expect(sheet.images[0]).toMatchObject({ r: 1, c: 4, w: 50, h: 40, mime: 'image/png' })
  })

  it('rejects a corrupt xlsx with an error instead of hanging', async () => {
    const bad = new TextEncoder().encode('PK\u0003\u0004 not really a zip').buffer as ArrayBuffer
    await expect(parseWorkbook(bad, 'xlsx', 'tr-TR')).rejects.toThrow()
  })
})

describe('parseWorkbook (csv, xls)', () => {
  it('reads a Windows-1254 semicolon CSV with Turkish letters', async () => {
    const bytes = new Uint8Array([0xde, 0x69, 0x72, 0x6b, 0x65, 0x74, 0x3b, 0x54, 0x75, 0x74, 0x61, 0x72, 0x0d, 0x0a, 0x49, 0xfe, 0xfd, 0x6b, 0x3b, 0x31, 0x30])
    const model = await parseWorkbook(bytes.buffer, 'csv', 'tr-TR')
    const s = model.sheets[0]
    expect(s.cells.get('0,0')?.text).toBe('Şirket')
    expect(s.cells.get('0,1')?.text).toBe('Tutar')
    expect(s.cells.get('1,0')?.text).toBe('Işık')
  })

  it('reads xls values through SheetJS', async () => {
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([['Ad', 'Tutar'], ['Ayşe', 1234.5]]), 'Sayfa1')
    const xls = XLSX.write(wb, { type: 'array', bookType: 'biff8' }) as ArrayBuffer
    const model = await parseWorkbook(xls, 'xls', 'tr-TR')
    expect(model.sheets[0].name).toBe('Sayfa1')
    expect(model.sheets[0].cells.get('1,0')?.text).toBe('Ayşe')
    expect(model.sheets[0].cells.get('1,1')).toMatchObject({ text: '1234,5', isNumber: true })
  })
})

describe('theme colours', () => {
  it('reads the colour scheme from theme XML in Excel index order', () => {
    const xml = `<a:clrScheme name="Office"><a:dk1><a:sysClr val="windowText" lastClr="000000"/></a:dk1>
      <a:lt1><a:sysClr val="window" lastClr="FFFFFF"/></a:lt1><a:dk2><a:srgbClr val="44546A"/></a:dk2>
      <a:lt2><a:srgbClr val="E7E6E6"/></a:lt2><a:accent1><a:srgbClr val="4472C4"/></a:accent1></a:clrScheme>`
    const p = themePalette(xml)
    expect(p.slice(0, 5)).toEqual(['#FFFFFF', '#000000', '#E7E6E6', '#44546A', '#4472C4'])
  })

  it('applies tint like Excel (positive lightens, negative darkens)', () => {
    expect(applyTint('#4472C4', 0)).toBe('#4472C4')
    expect(applyTint('#000000', 0.5)).toBe('#808080')
    expect(applyTint('#FFFFFF', -0.5)).toBe('#808080')
  })
})
