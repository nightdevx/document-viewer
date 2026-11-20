import type { OpenedFile, Viewer } from '../../../../shared/types'
import { printNode } from '../../shell/print'
import { emitStatus } from '../../shell/status'
import { checkZipSize, detectContainer, officeContainerError } from '../sniff'
import { buildAxis, indexAt, searchCells, type Axis } from './axis'
import { columnName } from './format'
import type { CellStyle, Merge, SheetModel, WorkbookModel } from './model'
import type { SheetReply, SheetRequest } from './sheet.worker'
import SheetWorker from './sheet.worker?worker'

const HEAD_H = 22
const BORDER: Record<string, string> = {
  thin: '1px solid',
  hair: '1px solid',
  medium: '2px solid',
  thick: '3px solid',
  dashed: '1px dashed',
  mediumDashed: '2px dashed',
  dotted: '1px dotted',
  dashDot: '1px dashed',
  mediumDashDot: '2px dashed',
  dashDotDot: '1px dotted',
  slantDashDot: '2px dashed',
  double: '3px double'
}
const JUSTIFY: Record<string, string> = { left: 'flex-start', center: 'center', centerContinuous: 'center', right: 'flex-end', fill: 'flex-start', justify: 'flex-start', distributed: 'center' }
const ALIGN: Record<string, string> = { top: 'flex-start', middle: 'center', bottom: 'flex-end', justify: 'flex-start', distributed: 'center' }

function parse(file: OpenedFile): Promise<WorkbookModel> & { worker: Worker; cancel: () => void } {
  const worker = new SheetWorker()
  let cancel = (): void => {}
  const p = new Promise<WorkbookModel>((resolve, reject) => {
    cancel = () => reject(new Error('Kapatıldı.'))
    worker.onmessage = (e: MessageEvent<SheetReply>) => (e.data.ok ? resolve(e.data.model) : reject(new Error('Çalışma kitabı okunamadı. Dosya bozuk olabilir.')))
    worker.onerror = () => reject(new Error('Çalışma kitabı okunamadı.'))
    const req: SheetRequest = { data: file.data.slice(0), ext: file.ext as SheetRequest['ext'], locale: navigator.language || 'tr-TR' }
    worker.postMessage(req, [req.data])
  })
  return Object.assign(p, { worker, cancel: () => cancel() })
}

function styleCell(el: HTMLElement, s: CellStyle, isNumber: boolean): void {
  const st = el.style
  const f = s.font
  if (f?.name) st.fontFamily = `"${f.name}", Calibri, sans-serif`
  if (f?.size) st.fontSize = `${(f.size * 4) / 3}px`
  if (f?.bold) st.fontWeight = '700'
  if (f?.italic) st.fontStyle = 'italic'
  if (f?.underline || f?.strike) st.textDecoration = [f.underline && 'underline', f.strike && 'line-through'].filter(Boolean).join(' ')
  if (f?.color) st.color = f.color
  if (s.fill) st.backgroundColor = s.fill
  for (const side of ['top', 'right', 'bottom', 'left'] as const) {
    const b = s.border?.[side]
    if (b) st.setProperty(`border-${side}`, `${BORDER[b.style] ?? '1px solid'} ${b.color ?? '#000'}`)
  }
  st.justifyContent = JUSTIFY[s.hAlign ?? ''] ?? (isNumber ? 'flex-end' : 'flex-start')
  st.alignItems = ALIGN[s.vAlign ?? ''] ?? 'flex-end'
  if (s.wrap) el.classList.add('wrap')
  if (s.indent) st.paddingLeft = `${3 + s.indent * 9}px`
}

export function createSheetViewer(): Viewer {
  let host: HTMLElement
  let model: WorkbookModel
  let worker: Worker | null = null
  let cancelParse = (): void => {}
  let sheet: SheetModel
  let rows: Axis
  let cols: Axis
  let hiddenRows = new Set<number>()
  let hiddenCols = new Set<number>()
  let covered = new Map<string, Merge>() // every cell of a merge -> the merge
  let scroller: HTMLElement
  let spacer: HTMLElement
  let layer: HTMLElement
  let tabsBar: HTMLElement
  let zoom = 1
  let selected: [number, number] = [0, 0]
  let matches: [number, number][] = []
  let lastQuery = ''
  let matchIndex = 0
  let frame = 0
  let HEAD_W = 48 // grows with the number of digits in the last row number
  const blobs: string[] = []
  const imageUrls = new Map<SheetModel['images'][number], string>()

  function selectSheet(i: number): void {
    sheet = model.sheets[i]
    hiddenRows = new Set(sheet.hiddenRows)
    hiddenCols = new Set(sheet.hiddenCols)
    rows = buildAxis(sheet.rowHeights, sheet.hiddenRows, Math.max(sheet.rowCount + 50, 100), 20)
    cols = buildAxis(sheet.colWidths, sheet.hiddenCols, Math.max(sheet.colCount + 10, 26), 64)
    HEAD_W = Math.max(48, String(rows.count).length * 8 + 14)
    covered = new Map()
    for (const m of sheet.merges) {
      for (let r = m.r1; r <= m.r2; r++) for (let c = m.c1; c <= m.c2; c++) covered.set(`${r},${c}`, m)
    }
    for (const img of sheet.images) {
      if (imageUrls.has(img)) continue
      const url = URL.createObjectURL(new Blob([img.data], { type: img.mime }))
      blobs.push(url)
      imageUrls.set(img, url)
    }
    selected = [sheet.frozen.rows, sheet.frozen.cols]
    matches = []
    lastQuery = ''
    for (const b of tabsBar.children) b.setAttribute('aria-selected', String(b.getAttribute('data-sheet') === String(i)))
    scroller.scrollTo(0, 0)
    layout()
  }

  function layout(): void {
    spacer.style.width = `${(HEAD_W + cols.total) * zoom}px`
    spacer.style.height = `${(HEAD_H + rows.total) * zoom}px`
    draw()
  }

  function schedule(): void {
    if (!frame) frame = requestAnimationFrame(() => ((frame = 0), draw()))
  }

  /** Renders the visible window in viewport coordinates; frozen rows and columns stay pinned. */
  function draw(): void {
    const vw = scroller.clientWidth / zoom
    const vh = scroller.clientHeight / zoom
    layer.style.width = `${vw}px`
    layer.style.height = `${vh}px`
    layer.style.zoom = String(zoom)
    const fr = sheet.frozen.rows
    const fc = sheet.frozen.cols
    const frozenH = rows.starts[fr]
    const frozenW = cols.starts[fc]
    const sx = scroller.scrollLeft / zoom
    const sy = scroller.scrollTop / zoom

    // viewport x of a column / y of a row
    const xOf = (c: number): number => HEAD_W + (c < fc ? cols.starts[c] : cols.starts[c] - sx)
    const yOf = (r: number): number => HEAD_H + (r < fr ? rows.starts[r] : rows.starts[r] - sy)

    const r0 = indexAt(rows, frozenH + sy)
    const r1 = indexAt(rows, sy + vh)
    const c0 = indexAt(cols, frozenW + sx)
    const c1 = indexAt(cols, sx + vw)
    const rowList = [...range(0, fr), ...range(r0, r1 + 1)].filter((r) => !hiddenRows.has(r))
    const colList = [...range(0, fc), ...range(c0, c1 + 1)].filter((c) => !hiddenCols.has(c))

    const frag = document.createDocumentFragment()
    const region = (r: number, c: number): string => (r < fr ? 'fr' : '') + (c < fc ? 'fc' : '') || 'body'
    const drawnMerges = new Set<Merge>()

    for (const r of rowList) {
      for (const c of colList) {
        const merge = covered.get(`${r},${c}`)
        if (merge) {
          if (drawnMerges.has(merge)) continue
          drawnMerges.add(merge)
        }
        const top = merge ?? { r1: r, c1: c, r2: r, c2: c }
        const cell = sheet.cells.get(`${top.r1},${top.c1}`)
        const el = document.createElement('div')
        el.className = `cell ${region(r, c)}`
        // A merge partly scrolled out of view is still drawn from its own top-left cell.
        const x = xOf(top.c1)
        const y = yOf(top.r1)
        let w = cols.starts[top.c2 + 1] - cols.starts[top.c1]
        const h = rows.starts[top.r2 + 1] - rows.starts[top.r1]
        if (cell) {
          const style = model.styles[cell.style]
          styleCell(el, style, cell.isNumber)
          const span = document.createElement('span')
          span.textContent = cell.text
          el.append(span)
          // Excel lets unwrapped left-aligned text run over empty neighbours.
          if (!merge && !style.wrap && !cell.isNumber && (style.hAlign ?? 'left') === 'left') {
            for (let n = c + 1; n <= c1 && !sheet.cells.has(`${r},${n}`) && !covered.has(`${r},${n}`); n++) w += cols.size(n)
            if (w > cols.size(c)) el.classList.add('spill')
          }
        }
        if (top.r1 === selected[0] && top.c1 === selected[1]) el.classList.add('selected')
        el.style.left = `${x}px`
        el.style.top = `${y}px`
        el.style.width = `${w}px`
        el.style.height = `${h}px`
        el.dataset.r = String(top.r1)
        el.dataset.c = String(top.c1)
        frag.append(el)
      }
    }

    for (const img of sheet.images) {
      const x = xOf(img.c) + img.dx
      const y = yOf(img.r) + img.dy
      if (x > vw || y > vh || x + img.w < 0 || y + img.h < 0) continue
      const el = document.createElement('img')
      el.className = 'sheet-image'
      el.src = imageUrls.get(img)!
      Object.assign(el.style, { left: `${x}px`, top: `${y}px`, width: `${img.w}px`, height: `${img.h}px` })
      el.alt = ''
      frag.append(el)
    }

    for (const c of colList) {
      const el = document.createElement('div')
      el.className = 'col-head' + (c === selected[1] ? ' active' : '') + (c < fc ? ' fc' : '')
      el.textContent = columnName(c)
      Object.assign(el.style, { left: `${xOf(c)}px`, width: `${cols.size(c)}px` })
      frag.append(el)
    }
    for (const r of rowList) {
      const el = document.createElement('div')
      el.className = 'row-head' + (r === selected[0] ? ' active' : '') + (r < fr ? ' fr' : '')
      el.textContent = String(r + 1)
      Object.assign(el.style, { top: `${yOf(r)}px`, height: `${rows.size(r)}px`, width: `${HEAD_W}px` })
      frag.append(el)
    }
    const corner = document.createElement('div')
    corner.className = 'corner'
    corner.style.width = `${HEAD_W}px`
    frag.append(corner)
    if (fr) frag.append(divider('h', HEAD_H + frozenH))
    if (fc) frag.append(divider('v', HEAD_W + frozenW))
    layer.replaceChildren(frag)
  }

  function divider(dir: 'h' | 'v', at: number): HTMLElement {
    const el = document.createElement('div')
    el.className = `freeze-line ${dir}`
    el.style[dir === 'h' ? 'top' : 'left'] = `${at}px`
    return el
  }

  function status(): void {
    const [r, c] = selected
    emitStatus(host, {
      position: `${columnName(c)}${r + 1}`,
      info: `${sheet.name} · ${sheet.rowCount.toLocaleString('tr-TR')} satır`
    })
  }

  function select(r: number, c: number, reveal = false): void {
    selected = [r, c]
    if (reveal) {
      const fr = sheet.frozen.rows
      const fc = sheet.frozen.cols
      const vw = scroller.clientWidth / zoom
      const vh = scroller.clientHeight / zoom
      const left = cols.starts[c] - cols.starts[fc]
      const top = rows.starts[r] - rows.starts[fr]
      const sx = scroller.scrollLeft / zoom
      const sy = scroller.scrollTop / zoom
      const viewW = vw - HEAD_W - cols.starts[fc]
      const viewH = vh - HEAD_H - rows.starts[fr]
      if (c >= fc && (left < sx || left + cols.size(c) > sx + viewW)) scroller.scrollLeft = Math.max(0, left - viewW / 3) * zoom
      if (r >= fr && (top < sy || top + rows.size(r) > sy + viewH)) scroller.scrollTop = Math.max(0, top - viewH / 3) * zoom
    }
    draw()
    status()
  }

  return {
    async mount(h, file) {
      host = h
      // SheetJS sniffs content, so an xlsx renamed to .xls is still a zip: guard every zip.
      if (file.ext === 'xlsx' || detectContainer(file.data) === 'zip') {
        const problem = officeContainerError(file.data)
        if (problem) throw new Error(problem)
        try {
          checkZipSize(file.data)
        } catch {
          throw new Error('Dosya açıldığında çok büyük ya da bozuk. Güvenlik için açılmadı.')
        }
      }
      const loading = document.createElement('div')
      loading.className = 'loading'
      loading.textContent = 'Çalışma kitabı açılıyor…'
      host.replaceChildren(loading)
      const job = parse(file)
      worker = job.worker
      cancelParse = job.cancel
      try {
        model = await job
      } finally {
        worker.terminate()
        worker = null
      }

      const view = document.createElement('div')
      view.className = 'sheet-view'
      scroller = document.createElement('div')
      scroller.className = 'sheet-scroll'
      spacer = document.createElement('div')
      spacer.className = 'sheet-spacer'
      layer = document.createElement('div')
      layer.className = 'sheet-layer'
      scroller.append(layer, spacer)
      tabsBar = document.createElement('div')
      tabsBar.className = 'sheet-tabs'
      tabsBar.setAttribute('role', 'tablist')
      model.sheets.forEach((s, i) => {
        if (s.hidden) return
        const b = document.createElement('button')
        b.type = 'button'
        b.className = 'sheet-tab'
        b.textContent = s.name
        b.dataset.sheet = String(i)
        b.setAttribute('role', 'tab')
        b.addEventListener('click', () => (selectSheet(i), status()))
        tabsBar.append(b)
      })
      view.append(scroller, tabsBar)
      host.replaceChildren(view)

      scroller.addEventListener('scroll', schedule, { passive: true })
      new ResizeObserver(schedule).observe(scroller)
      layer.addEventListener('mousedown', (e) => {
        const cell = (e.target as HTMLElement).closest<HTMLElement>('.cell')
        if (cell) select(Number(cell.dataset.r), Number(cell.dataset.c))
      })
      const first = model.sheets[model.activeSheet]?.hidden ? model.sheets.findIndex((s) => !s.hidden) : model.activeSheet
      selectSheet(Math.max(0, first))
      status()
    },
    setZoom(z) {
      const fx = scroller.scrollLeft / zoom
      const fy = scroller.scrollTop / zoom
      zoom = z
      layout()
      scroller.scrollTo(fx * zoom, fy * zoom)
    },
    search(query, dir) {
      if (query !== lastQuery) {
        lastQuery = query
        matches = searchCells(sheet.cells, query, hiddenRows, hiddenCols)
        matchIndex = 0
      } else if (matches.length) {
        matchIndex = (matchIndex + dir + matches.length) % matches.length
      }
      if (matches.length) select(...matches[matchIndex], true)
      return { index: matchIndex, total: matches.length }
    },
    clearSearch() {
      lastQuery = ''
      matches = []
    },
    async print() {
      // ponytail: the whole used range becomes one table; split into pages by hand if huge sheets matter.
      const table = document.createElement('table')
      table.className = 'print-sheet'
      for (let r = 0; r < sheet.rowCount; r++) {
        if (hiddenRows.has(r)) continue
        const tr = table.insertRow()
        for (let c = 0; c < sheet.colCount; c++) {
          if (hiddenCols.has(c)) continue
          const merge = covered.get(`${r},${c}`)
          if (merge && (merge.r1 !== r || merge.c1 !== c)) continue
          const td = tr.insertCell()
          const cell = sheet.cells.get(`${r},${c}`)
          if (merge) {
            td.rowSpan = merge.r2 - merge.r1 + 1
            td.colSpan = merge.c2 - merge.c1 + 1
          }
          td.style.minWidth = `${cols.size(c)}px`
          if (cell) {
            td.textContent = cell.text
            const s = model.styles[cell.style]
            if (s.font?.bold) td.style.fontWeight = '700'
            if (s.fill) td.style.background = s.fill
            if (s.font?.color) td.style.color = s.font.color
            td.style.textAlign = s.hAlign ?? (cell.isNumber ? 'right' : 'left')
          }
        }
      }
      await printNode(table)
    },
    dispose() {
      worker?.terminate()
      cancelParse()
      cancelAnimationFrame(frame)
      blobs.forEach((u) => URL.revokeObjectURL(u))
    }
  }
}

function* range(from: number, to: number): Generator<number> {
  for (let i = from; i < to; i++) yield i
}
