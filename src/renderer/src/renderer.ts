import {
  BookOpen,
  ChevronDown,
  ChevronUp,
  createElement,
  File as FileIcon,
  FileCode,
  FileText,
  FolderOpen,
  Minus,
  Plus,
  Presentation,
  Printer,
  Search,
  Sheet,
  X,
  type IconNode
} from 'lucide'
import type { OpenedFile, ViewerKind } from '../../shared/types'
import { linkPolicy } from '../../shared/links'
import { TabManager, type Tab } from './shell/tabs'
import { clampZoom, nextZoom } from './shell/zoom'
import { createViewer } from './viewers'
import { pickViewer } from './viewers/registry'

const $ = <T extends HTMLElement = HTMLElement>(id: string): T => document.getElementById(id) as T
const icon = (node: IconNode): SVGElement => createElement(node, { 'aria-hidden': 'true' })

const kindIcons: Record<ViewerKind, IconNode> = {
  pdf: FileText,
  docx: FileText,
  sheet: Sheet,
  pptx: Presentation,
  markdown: BookOpen,
  code: FileCode,
  unsupported: FileIcon
}

const content = $('content')
const tabsEl = $('tabs')
const searchInput = $<HTMLInputElement>('search')
const searchCount = $('search-count')

$('open').append(icon(Plus))
$('search-icon').append(icon(Search))
$('search-prev').append(icon(ChevronUp))
$('search-next').append(icon(ChevronDown))
$('zoom-out').append(icon(Minus))
$('zoom-in').append(icon(Plus))
$('print').append(icon(Printer))
$('empty-icon').append(icon(FolderOpen))
$('notice-close').append(icon(X))

const tm = new TabManager({ content, createViewer, onChange: render })

// ---------- rendering ----------

function render(): void {
  tabsEl.replaceChildren(...tm.tabs.map(tabElement))
  const active = tm.active
  $('empty').hidden = tm.tabs.length > 0
  $('tools').setAttribute('aria-disabled', String(!active || active.failed))
  $('tools').toggleAttribute('data-empty', !active)
  document.title = active ? `${active.file.name} · Document Viewer` : 'Document Viewer'
  renderZoom()
  renderStatus()
  tabsEl.querySelector('[aria-selected="true"]')?.scrollIntoView({ block: 'nearest', inline: 'nearest' })
}

function tabElement(tab: Tab): HTMLElement {
  const el = document.createElement('div')
  el.className = 'tab' + (tab.failed ? ' failed' : '')
  el.setAttribute('role', 'tab')
  el.setAttribute('aria-selected', String(tab === tm.active))
  el.tabIndex = tab === tm.active ? 0 : -1
  el.title = tab.file.path
  const ic = icon(kindIcons[pickViewer(tab.file.ext)])
  ic.classList.add('tab-icon')
  const name = document.createElement('span')
  name.className = 'tab-name'
  name.textContent = tab.file.name
  const close = document.createElement('button')
  close.className = 'icon-btn'
  close.type = 'button'
  close.title = 'Kapat (Ctrl+W)'
  close.setAttribute('aria-label', `${tab.file.name} kapat`)
  close.append(icon(X))
  close.addEventListener('click', (e) => {
    e.stopPropagation()
    closeTab(tab.id)
  })
  el.append(ic, name, close)
  el.addEventListener('mousedown', (e) => {
    if (e.button === 1) e.preventDefault()
  })
  el.addEventListener('mouseup', (e) => e.button === 1 && closeTab(tab.id))
  el.addEventListener('click', () => switchTo(tab.id))
  el.addEventListener('keydown', (e) => (e.key === 'Enter' || e.key === ' ') && switchTo(tab.id))
  return el
}

function renderZoom(): void {
  const z = tm.active?.zoom ?? 1
  $('zoom-value').textContent = `%${Math.round(z * 100)}`
  const cm = (96 / 2.54) * z
  const ticks = $('ruler-ticks')
  ticks.style.setProperty('--cm', `${cm}px`)
  ticks.style.setProperty('--minor', `${cm / 10 >= 4 ? cm / 10 : cm / 2}px`)
}

function renderStatus(): void {
  const host = tm.active?.host
  $('status-position').textContent = host?.dataset.position ?? ''
  $('status-info').textContent = host?.dataset.info ?? ''
}

content.addEventListener('viewer-status', (e) => {
  if (e.target === tm.active?.host) renderStatus()
})

// ---------- actions ----------

function switchTo(id: number): void {
  if (tm.active?.id === id) return
  resetSearch()
  tm.activate(id)
}

function closeTab(id: number): void {
  if (tm.active?.id === id) resetSearch()
  tm.close(id)
}

function setZoom(z: number): void {
  const tab = tm.active
  if (!tab || tab.failed) return
  tab.zoom = clampZoom(z)
  tab.viewer.setZoom(tab.zoom)
  renderZoom()
}

function showNotice(text: string): void {
  $('notice-text').textContent = text
  $('notice').hidden = false
}
$('notice-close').addEventListener('click', () => ($('notice').hidden = true))

const readErrors: Record<string, string> = {
  NOT_FOUND: 'dosya bulunamadı.',
  ACCESS_DENIED: 'dosyaya erişim izni yok.',
  UNKNOWN: 'dosya okunamadı.'
}

function confirmLarge(name: string, size: number): Promise<boolean> {
  const dialog = $<HTMLDialogElement>('large-dialog')
  $('large-title').textContent = `${name} ${Math.round(size / 1024 / 1024)} MB. Yine de açılsın mı?`
  dialog.returnValue = ''
  dialog.showModal()
  return new Promise((resolve) =>
    dialog.addEventListener('close', () => resolve(dialog.returnValue === 'open'), { once: true })
  )
}

async function openPath(path: string): Promise<void> {
  const api = window.api!
  const name = path.split(/[\\/]/).pop() ?? path
  try {
    let file: OpenedFile
    try {
      file = await api.readFile(path)
    } catch (e) {
      const err = e as { code?: string; size?: number }
      if (err.code !== 'TOO_LARGE' || !(await confirmLarge(name, err.size ?? 0))) throw e
      file = await api.readFile(path, { allowLarge: true })
    }
    await tm.open(file)
  } catch (e) {
    const code = (e as { code?: string }).code ?? 'UNKNOWN'
    if (code !== 'TOO_LARGE') showNotice(`${name} açılamadı: ${readErrors[code] ?? readErrors.UNKNOWN}`)
  }
}

async function openPaths(paths: string[]): Promise<void> {
  for (const p of paths) await openPath(p)
}

async function openDialog(): Promise<void> {
  if (window.api) await openPaths(await window.api.openDialog())
}

async function openFileObject(f: File): Promise<void> {
  const path = window.api?.pathForFile(f) || f.name
  if (window.api && path !== f.name) return openPath(path)
  const ext = f.name.includes('.') ? f.name.split('.').pop()!.toLowerCase() : ''
  await tm.open({ path, name: f.name, ext, size: f.size, data: await f.arrayBuffer() })
}

// ---------- search ----------

let lastQuery = ''

function runSearch(dir: 1 | -1): void {
  const tab = tm.active
  const q = searchInput.value.trim()
  if (!tab || !q) return resetSearch()
  if (q !== lastQuery) tab.viewer.clearSearch()
  lastQuery = q
  const r = tab.viewer.search(q, dir)
  searchCount.textContent = r.total ? `${r.index + 1} / ${r.total}` : 'Bulunamadı'
  searchCount.classList.toggle('none', r.total === 0)
}

function resetSearch(): void {
  tm.active?.viewer.clearSearch()
  lastQuery = ''
  searchCount.textContent = ''
  searchCount.classList.remove('none')
}

searchInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    e.preventDefault()
    runSearch(e.shiftKey ? -1 : 1)
  } else if (e.key === 'Escape') {
    searchInput.value = ''
    resetSearch()
    searchInput.blur()
  }
})
searchInput.addEventListener('input', () => !searchInput.value && resetSearch())
$('search-next').addEventListener('click', () => runSearch(1))
$('search-prev').addEventListener('click', () => runSearch(-1))

// ---------- wiring ----------

$('open').addEventListener('click', openDialog)
$('empty-open').addEventListener('click', openDialog)
$('default-apps').addEventListener('click', () => window.api?.openDefaultAppsSettings())
$('zoom-in').addEventListener('click', () => setZoom(nextZoom(tm.active?.zoom ?? 1, 1)))
$('zoom-out').addEventListener('click', () => setZoom(nextZoom(tm.active?.zoom ?? 1, -1)))
$('ruler').addEventListener('click', () => setZoom(1))
$('print').addEventListener('click', () => tm.active?.viewer.print())

document.addEventListener('keydown', (e) => {
  if (!e.ctrlKey) return
  const key = e.key.toLowerCase()
  const actions: Record<string, () => void> = {
    o: openDialog,
    w: () => tm.active && closeTab(tm.active.id),
    f: () => searchInput.select(),
    p: () => tm.active?.viewer.print(),
    '+': () => setZoom(nextZoom(tm.active?.zoom ?? 1, 1)),
    '=': () => setZoom(nextZoom(tm.active?.zoom ?? 1, 1)),
    '-': () => setZoom(nextZoom(tm.active?.zoom ?? 1, -1)),
    '0': () => setZoom(1),
    tab: () => {
      const i = tm.tabs.findIndex((t) => t === tm.active)
      const n = tm.tabs.length
      if (n > 1) switchTo(tm.tabs[(i + (e.shiftKey ? n - 1 : 1)) % n].id)
    }
  }
  const action = actions[key]
  if (action) {
    e.preventDefault()
    action()
  }
})

content.addEventListener(
  'wheel',
  (e) => {
    if (!e.ctrlKey) return
    e.preventDefault()
    setZoom(nextZoom(tm.active?.zoom ?? 1, e.deltaY < 0 ? 1 : -1))
  },
  { passive: false }
)

// Links inside documents: web and mail open outside, everything else is ignored.
document.addEventListener('click', (e) => {
  const a = (e.target as Element).closest?.('a[href]') as HTMLAnchorElement | null
  if (!a || a.getAttribute('href')?.startsWith('#')) return
  e.preventDefault()
  if (linkPolicy(a.href) === 'external') window.api?.openExternal(a.href)
})

let dragDepth = 0
document.addEventListener('dragenter', (e) => {
  e.preventDefault()
  dragDepth++
  document.body.classList.add('dragging')
})
document.addEventListener('dragleave', () => {
  if (--dragDepth <= 0) {
    dragDepth = 0
    document.body.classList.remove('dragging')
  }
})
document.addEventListener('dragover', (e) => e.preventDefault())
document.addEventListener('drop', async (e) => {
  e.preventDefault()
  dragDepth = 0
  document.body.classList.remove('dragging')
  for (const f of Array.from(e.dataTransfer?.files ?? [])) await openFileObject(f)
})

window.api?.onOpenFiles(openPaths)

// Dev only: ?open=a.pdf,b.md loads files from test-files/ when running in a plain browser.
if (import.meta.env.DEV && !window.api) {
  const names = new URLSearchParams(location.search).get('open')?.split(',').filter(Boolean) ?? []
  for (const name of names) {
    const res = await fetch(`/@fs/${__TEST_FILES_DIR__}/${name}`)
    const data = await res.arrayBuffer()
    await tm.open({ path: name, name, ext: name.split('.').pop()!.toLowerCase(), size: data.byteLength, data })
  }
}

render()
