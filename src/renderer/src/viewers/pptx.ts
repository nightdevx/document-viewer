import { init } from 'pptx-preview'
import type { Viewer } from '../../../shared/types'
import { createDomSearch, type DomSearch } from '../shell/dom-search'
import { printNode } from '../shell/print'
import { emitStatus } from '../shell/status'
import { assertOfficeZip } from './docx'
import { guardImages } from './images'

const SLIDE_W = 960

export function createPptxViewer(): Viewer {
  let host: HTMLElement
  let stage: HTMLElement
  let deck: HTMLElement
  let thumbs: HTMLElement
  let slides: HTMLElement[] = []
  let search: DomSearch
  let observer: IntersectionObserver | null = null
  let previewer: ReturnType<typeof init> | null = null
  let current = 0

  function status(i: number): void {
    current = i
    thumbs.querySelectorAll('.thumb').forEach((t, n) => t.setAttribute('aria-current', String(n === i)))
    thumbs.children[i]?.scrollIntoView({ block: 'nearest' })
    emitStatus(host, { position: `${i + 1} / ${slides.length}`, info: 'Slayt' })
  }

  const goTo = (i: number): void => slides[Math.max(0, Math.min(slides.length - 1, i))]?.scrollIntoView({ block: 'start' })

  return {
    async mount(h, file) {
      host = h
      assertOfficeZip(file.data)
      const view = document.createElement('div')
      view.className = 'pptx-view'
      thumbs = document.createElement('nav')
      thumbs.className = 'pptx-thumbs'
      thumbs.setAttribute('aria-label', 'Slaytlar')
      stage = document.createElement('div')
      stage.className = 'pptx-stage'
      deck = document.createElement('div')
      deck.className = 'pptx-deck'
      stage.append(deck)
      view.append(thumbs, stage)
      host.replaceChildren(view)

      previewer = init(deck, { width: SLIDE_W, mode: 'list' })
      try {
        await previewer.preview(file.data.slice(0))
      } catch {
        throw new Error('Sunum okunamadı. Dosya bozuk olabilir.')
      }
      guardImages(deck)
      // pptx-preview draws charts half-way (axes without bars, a Chinese default title); show an honest placeholder.
      for (const chart of deck.querySelectorAll<HTMLElement>('.chart-node')) {
        const ph = document.createElement('div')
        ph.className = 'chart-placeholder'
        ph.textContent = 'Grafik bu sürümde gösterilemiyor'
        chart.replaceChildren(ph)
      }
      slides = [...deck.querySelectorAll<HTMLElement>('.pptx-preview-slide-wrapper')]

      // ponytail: thumbnails are scaled DOM clones of each slide; render lazily if big decks get slow.
      slides.forEach((slide, i) => {
        const b = document.createElement('button')
        b.type = 'button'
        b.className = 'thumb'
        b.setAttribute('aria-label', `Slayt ${i + 1}`)
        const frame = document.createElement('div')
        frame.className = 'thumb-frame'
        const clone = slide.cloneNode(true) as HTMLElement
        clone.removeAttribute('id')
        frame.append(clone)
        const num = document.createElement('span')
        num.textContent = String(i + 1)
        b.append(num, frame)
        b.addEventListener('click', () => goTo(i))
        thumbs.append(b)
      })

      observer = new IntersectionObserver(
        (entries) => {
          const seen = entries.filter((e) => e.isIntersecting).map((e) => slides.indexOf(e.target as HTMLElement))
          if (seen.length) status(Math.min(...seen))
        },
        { root: stage, threshold: 0.5 }
      )
      slides.forEach((s) => observer!.observe(s))
      stage.tabIndex = 0
      stage.addEventListener('keydown', (e) => {
        if (e.key === 'PageDown') (e.preventDefault(), goTo(current + 1))
        if (e.key === 'PageUp') (e.preventDefault(), goTo(current - 1))
      })
      search = createDomSearch(deck)
      status(0)
    },
    setZoom(z) {
      deck.style.zoom = String(z)
    },
    search: (q, dir) => search.search(q, dir),
    clearSearch: () => search?.clear(),
    async print() {
      const pages = document.createElement('div')
      pages.className = 'print-slides'
      slides.forEach((s) => pages.append(s.cloneNode(true)))
      await printNode(pages)
    },
    dispose() {
      observer?.disconnect()
      search?.clear()
      previewer?.destroy()
    }
  }
}
