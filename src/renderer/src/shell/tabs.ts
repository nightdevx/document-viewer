import type { OpenedFile, Viewer } from '../../../shared/types'
import { errorScreen } from './screens'

export type Tab = { id: number; file: OpenedFile; viewer: Viewer; host: HTMLElement; zoom: number; failed: boolean }

type Options = {
  content: HTMLElement
  /** May be async so heavy viewers load on demand. */
  createViewer: (file: OpenedFile) => Viewer | Promise<Viewer>
  onChange: () => void
}

/** Stands in until the real viewer loads, and stays when loading it fails. */
const inertViewer: Viewer = {
  mount: async () => {},
  setZoom: () => {},
  search: () => ({ index: 0, total: 0 }),
  clearSearch: () => {},
  print: async () => {},
  dispose: () => {}
}

export const normalizePath = (p: string): string => p.replace(/\//g, '\\').toLowerCase()

export class TabManager {
  tabs: Tab[] = []
  active: Tab | null = null
  private nextId = 1

  constructor(private opts: Options) {}

  private pending = new Map<string, Promise<Tab>>()

  open(file: OpenedFile): Promise<Tab> {
    const key = normalizePath(file.path)
    const existing = this.tabs.find((t) => normalizePath(t.file.path) === key)
    if (existing) {
      this.activate(existing.id)
      return Promise.resolve(existing)
    }
    // A second open of the same file while the first is still loading joins it.
    let p = this.pending.get(key)
    if (!p) {
      p = this.create(file).finally(() => this.pending.delete(key))
      this.pending.set(key, p)
    }
    return p
  }

  private async create(file: OpenedFile): Promise<Tab> {
    const host = document.createElement('div')
    host.className = 'tab-host'
    this.opts.content.append(host)
    const tab: Tab = { id: this.nextId++, file, viewer: inertViewer, host, zoom: 1, failed: false }
    this.tabs.push(tab)
    this.activate(tab.id)
    try {
      tab.viewer = await this.opts.createViewer(file)
      if (this.tabs.includes(tab)) await tab.viewer.mount(host, file)
    } catch (e) {
      tab.failed = true
      host.replaceChildren(errorScreen(file.name, e instanceof Error ? e.message : String(e)))
      this.opts.onChange()
    }
    // Closed while loading: close() only saw the stand-in, so release the real viewer now.
    if (!this.tabs.includes(tab)) tab.viewer.dispose()
    return tab
  }

  activate(id: number): void {
    const tab = this.tabs.find((t) => t.id === id)
    if (!tab) return
    this.active = tab
    for (const t of this.tabs) t.host.hidden = t !== tab
    this.opts.onChange()
  }

  close(id: number): void {
    const i = this.tabs.findIndex((t) => t.id === id)
    if (i < 0) return
    const [tab] = this.tabs.splice(i, 1)
    this.pending.delete(normalizePath(tab.file.path))
    tab.viewer.dispose()
    tab.host.remove()
    if (this.active === tab) {
      const next = this.tabs[Math.max(0, i - 1)]
      this.active = null
      if (next) return this.activate(next.id)
    }
    this.opts.onChange()
  }
}
