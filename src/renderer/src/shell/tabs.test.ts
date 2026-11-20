// @vitest-environment happy-dom
import { describe, expect, it, vi } from 'vitest'
import type { OpenedFile, Viewer } from '../../../shared/types'
import { normalizePath, TabManager } from './tabs'

const file = (path: string): OpenedFile => ({
  path,
  name: path.split('\\').pop()!,
  ext: 'txt',
  size: 0,
  data: new ArrayBuffer(0)
})

function fakeViewer(): Viewer {
  return {
    mount: vi.fn(async () => {}),
    setZoom: vi.fn(),
    search: vi.fn(() => ({ index: 0, total: 0 })),
    clearSearch: vi.fn(),
    print: vi.fn(async () => {}),
    dispose: vi.fn()
  }
}

function setup(): { tm: TabManager; content: HTMLElement; viewers: Viewer[] } {
  const content = document.createElement('div')
  const viewers: Viewer[] = []
  const tm = new TabManager({
    content,
    createViewer: () => {
      const v = fakeViewer()
      viewers.push(v)
      return v
    },
    onChange: () => {}
  })
  return { tm, content, viewers }
}

describe('normalizePath', () => {
  it('ignores case and slash direction', () => {
    expect(normalizePath('C:/Belgeler/A.PDF')).toBe(normalizePath('c:\\belgeler\\a.pdf'))
  })
})

describe('TabManager', () => {
  it('opening the same file twice keeps one tab and activates it', async () => {
    const { tm, viewers } = setup()
    const a = await tm.open(file('C:\\x\\a.txt'))
    await tm.open(file('C:\\x\\b.txt'))
    const again = await tm.open(file('c:/x/A.txt'))
    expect(tm.tabs).toHaveLength(2)
    expect(again.id).toBe(a.id)
    expect(tm.active?.id).toBe(a.id)
    expect(viewers).toHaveLength(2)
  })

  it('two concurrent opens of the same file make one tab', async () => {
    const { tm, viewers } = setup()
    const [a, b] = await Promise.all([tm.open(file('C:\\a.txt')), tm.open(file('C:\\A.txt'))])
    expect(a.id).toBe(b.id)
    expect(tm.tabs).toHaveLength(1)
    expect(viewers).toHaveLength(1)
  })

  it('a viewer that fails to mount shows an error screen and other tabs keep working', async () => {
    const content = document.createElement('div')
    let n = 0
    const tm = new TabManager({
      content,
      createViewer: () => {
        const v = fakeViewer()
        if (n++ === 0) v.mount = async () => Promise.reject(new Error('Dosya bozuk ya da uzantısı yanlış.'))
        return v
      },
      onChange: () => {}
    })
    const bad = await tm.open(file('C:\\bozuk.docx'))
    expect(bad.failed).toBe(true)
    expect(bad.host.querySelector('.error-screen')?.textContent).toContain('Dosya bozuk ya da uzantısı yanlış.')
    expect(bad.host.querySelector('.error-screen')?.textContent).toContain('bozuk.docx')
    const good = await tm.open(file('C:\\iyi.txt'))
    expect(good.failed).toBe(false)
    expect(tm.tabs).toHaveLength(2)
  })

  it('a tab closed while its viewer is still mounting is disposed once mounting ends, and can be reopened', async () => {
    const content = document.createElement('div')
    let release!: () => void
    const viewers: Viewer[] = []
    const tm = new TabManager({
      content,
      createViewer: async () => {
        const v = fakeViewer()
        viewers.push(v)
        // The first viewer is still being imported when the tab is closed.
        if (viewers.length === 1) await new Promise<void>((r) => (release = r))
        return v
      },
      onChange: () => {}
    })
    const opening = tm.open(file('C:\\yavas.xlsx'))
    await Promise.resolve()
    tm.close(tm.tabs[0].id)
    release()
    await opening
    expect(viewers[0].dispose).toHaveBeenCalled()
    expect(tm.tabs).toHaveLength(0)
    const again = await tm.open(file('C:\\yavas.xlsx'))
    expect(tm.tabs).toEqual([again])
    expect(viewers).toHaveLength(2)
  })

  it('close disposes the viewer once and removes its host', async () => {
    const { tm, content, viewers } = setup()
    const a = await tm.open(file('C:\\a.txt'))
    tm.close(a.id)
    expect(viewers[0].dispose).toHaveBeenCalledTimes(1)
    expect(content.children).toHaveLength(0)
    expect(tm.active).toBeNull()
  })

  it('closing the active tab activates its left neighbour', async () => {
    const { tm } = setup()
    const a = await tm.open(file('C:\\a.txt'))
    await tm.open(file('C:\\b.txt'))
    const c = await tm.open(file('C:\\c.txt'))
    tm.close(c.id)
    expect(tm.active?.file.name).toBe('b.txt')
    tm.activate(a.id)
    tm.close(a.id)
    expect(tm.active?.file.name).toBe('b.txt')
  })

  it('keeps hidden tabs in the DOM and shows only the active host', async () => {
    const { tm } = setup()
    const a = await tm.open(file('C:\\a.txt'))
    const b = await tm.open(file('C:\\b.txt'))
    expect(a.host.hidden).toBe(true)
    expect(b.host.hidden).toBe(false)
    tm.activate(a.id)
    expect(a.host.hidden).toBe(false)
    expect(b.host.hidden).toBe(true)
  })
})
