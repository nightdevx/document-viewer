import * as pdfjs from 'pdfjs-dist'
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url'
import { EventBus, FindState, PDFFindController, PDFLinkService, PDFViewer } from 'pdfjs-dist/web/pdf_viewer.mjs'
import 'pdfjs-dist/web/pdf_viewer.css'
import type { SearchResult, Viewer } from '../../../shared/types'
import { printNode } from '../shell/print'
import { emitStatus } from '../shell/status'
import { describePage } from './paper'

pdfjs.GlobalWorkerOptions.workerSrc = workerUrl

// Copied from pdfjs-dist by scripts/copy-pdfjs.mjs into the renderer's public folder.
const assets = new URL('pdfjs/', document.baseURI).href

function askPassword(host: HTMLElement, wrong: boolean): Promise<string | null> {
  const dialog = document.createElement('dialog')
  dialog.className = 'dialog'
  dialog.innerHTML = `<form method="dialog">
      <h2></h2><p></p>
      <input class="text-input" type="password" autocomplete="off" aria-label="Şifre" />
      <div class="dialog-actions">
        <button class="secondary-btn" value="cancel" type="submit">Vazgeç</button>
        <button class="primary-btn" value="ok" type="submit">Aç</button>
      </div></form>`
  dialog.querySelector('h2')!.textContent = 'Bu PDF şifreli'
  dialog.querySelector('p')!.textContent = wrong ? 'Şifre yanlış, tekrar dene.' : 'Açmak için şifresini gir.'
  host.append(dialog)
  dialog.showModal()
  return new Promise((resolve) =>
    dialog.addEventListener('close', () => {
      const value = dialog.querySelector('input')!.value
      dialog.remove()
      resolve(dialog.returnValue === 'ok' ? value : null)
    })
  )
}

export function createPdfViewer(): Viewer {
  let task: pdfjs.PDFDocumentLoadingTask | null = null
  let doc: pdfjs.PDFDocumentProxy | null = null
  let viewer: PDFViewer
  let eventBus: EventBus
  let host: HTMLElement
  let container: HTMLDivElement
  let lastQuery = ''

  // pdf.js scrolls page 1 flush to the top on load and zoom; keep the table margin above it.
  const showTopMargin = (): void => {
    if (viewer.currentPageNumber === 1 && container.scrollTop <= 24) container.scrollTop = 0
  }

  function status(): void {
    const n = viewer.currentPageNumber
    const view = viewer.getPageView(n - 1)?.pdfPage?.view
    const rotated = ((view && viewer.pagesRotation) || 0) % 180 !== 0
    const [w, h] = view ? [view[2] - view[0], view[3] - view[1]] : [0, 0]
    emitStatus(host, {
      position: `${n} / ${viewer.pagesCount}`,
      info: view ? (rotated ? describePage(h, w) : describePage(w, h)) : ''
    })
  }

  const counts = (m: { current: number; total: number }): SearchResult => ({
    index: Math.max(0, m.current - 1),
    total: m.total
  })

  return {
    async mount(h, file) {
      host = h
      container = document.createElement('div')
      container.className = 'pdf-container'
      const inner = document.createElement('div')
      inner.className = 'pdfViewer'
      container.append(inner)
      host.replaceChildren(container)

      eventBus = new EventBus()
      const linkService = new PDFLinkService({ eventBus })
      const findController = new PDFFindController({ eventBus, linkService })
      viewer = new PDFViewer({ container, eventBus, linkService, findController })
      linkService.setViewer(viewer)

      task = pdfjs.getDocument({
        // pdf.js transfers the buffer to its worker; keep the tab's copy intact.
        data: new Uint8Array(file.data.slice(0)),
        cMapUrl: assets + 'cmaps/',
        standardFontDataUrl: assets + 'standard_fonts/',
        wasmUrl: assets + 'wasm/',
        iccUrl: assets + 'iccs/',
        enableXfa: false
      })
      task.onPassword = async (update: (pw: string) => void, reason: number) => {
        const pw = await askPassword(host, reason === pdfjs.PasswordResponses.INCORRECT_PASSWORD)
        if (pw === null) task?.destroy()
        else update(pw)
      }
      try {
        doc = await task.promise
      } catch (e) {
        if ((e as Error).name === 'PasswordException' || task.destroyed) throw new Error('Şifre girilmediği için açılmadı.')
        throw new Error('PDF okunamadı. Dosya bozuk olabilir.')
      }
      viewer.setDocument(doc)
      linkService.setDocument(doc)
      eventBus.on('pagesinit', () => {
        viewer.currentScale = 1
        showTopMargin()
        status()
      })
      eventBus.on('pagechanging', status)
      eventBus.on('updatefindmatchescount', (e: { matchesCount: { current: number; total: number } }) =>
        host.dispatchEvent(new CustomEvent('viewer-search', { bubbles: true, detail: counts(e.matchesCount) }))
      )
    },
    setZoom(z) {
      viewer.currentScale = z
      showTopMargin()
    },
    search(query, dir) {
      const again = query === lastQuery
      lastQuery = query
      return new Promise<SearchResult>((resolve) => {
        const done = (e: { state: number; matchesCount: { current: number; total: number } }): void => {
          if (e.state === FindState.PENDING) return
          eventBus.off('updatefindcontrolstate', done)
          resolve(counts(e.matchesCount))
        }
        eventBus.on('updatefindcontrolstate', done)
        eventBus.dispatch('find', {
          source: null,
          type: again ? 'again' : '',
          query,
          caseSensitive: false,
          entireWord: false,
          highlightAll: true,
          findPrevious: dir === -1,
          matchDiacritics: false
        })
      })
    },
    clearSearch() {
      lastQuery = ''
      eventBus?.dispatch('findbarclose', { source: null })
    },
    async print() {
      if (!doc) return
      // ponytail: every page is rasterised at 150 dpi before printing; render in batches if huge PDFs run out of memory.
      const pages = document.createElement('div')
      pages.className = 'print-pages'
      for (let i = 1; i <= doc.numPages; i++) {
        const page = await doc.getPage(i)
        const viewport = page.getViewport({ scale: 150 / 72 })
        const canvas = document.createElement('canvas')
        canvas.width = Math.floor(viewport.width)
        canvas.height = Math.floor(viewport.height)
        await page.render({ canvas, viewport }).promise
        pages.append(canvas)
      }
      await printNode(pages)
    },
    dispose() {
      task?.destroy()
    }
  }
}
