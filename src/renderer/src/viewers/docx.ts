import { renderAsync } from 'docx-preview'
import JSZip from 'jszip'
import type { Viewer } from '../../../shared/types'
import { createDomSearch, type DomSearch } from '../shell/dom-search'
import { printNode } from '../shell/print'
import { emitStatus } from '../shell/status'
import { contextualSpacingCss } from './docx-fixes'
import { guardImages } from './images'
import { describePage } from './paper'
import { checkZipSize, officeContainerError } from './sniff'

/** Throws a readable error for anything that is not a sane Office zip. */
export function assertOfficeZip(data: ArrayBuffer): void {
  const problem = officeContainerError(data)
  if (problem) throw new Error(problem)
  try {
    checkZipSize(data)
  } catch {
    throw new Error('Dosya açıldığında çok büyük ya da bozuk. Güvenlik için açılmadı.')
  }
}

export function createDocxViewer(): Viewer {
  let host: HTMLElement
  let doc: HTMLElement
  let search: DomSearch
  let observer: IntersectionObserver | null = null

  return {
    async mount(h, file) {
      host = h
      assertOfficeZip(file.data)
      doc = document.createElement('div')
      doc.className = 'docx-doc'
      const styles = document.createElement('div')
      try {
        await renderAsync(file.data, doc, styles, {
          className: 'docx',
          inWrapper: true,
          breakPages: true,
          ignoreLastRenderedPageBreak: true,
          experimental: true,
          renderHeaders: true,
          renderFooters: true,
          renderFootnotes: true,
          renderEndnotes: true,
          renderComments: false,
          renderChanges: false,
          // Embedded HTML chunks could carry markup we do not want to run.
          renderAltChunks: false,
          useBase64URL: false
        })
      } catch {
        throw new Error('Word belgesi okunamadı. Dosya bozuk olabilir.')
      }
      const fixes = document.createElement('style')
      const zip = await JSZip.loadAsync(file.data)
      fixes.textContent = contextualSpacingCss((await zip.file('word/styles.xml')?.async('string')) ?? '')
      doc.prepend(styles, fixes)
      host.replaceChildren(doc)
      guardImages(doc)
      search = createDomSearch(doc)

      const pages = [...doc.querySelectorAll<HTMLElement>('section.docx')]
      const report = (i: number): void => {
        const page = pages[i]
        // docx-preview sizes each page from the section's page size, in pt.
        const w = parseFloat(page?.style.width ?? '')
        const hgt = parseFloat(page?.style.minHeight ?? page?.style.height ?? '')
        emitStatus(host, {
          position: `${i + 1} / ${pages.length}`,
          info: w && hgt && page.style.width.endsWith('pt') ? describePage(w, hgt) : ''
        })
      }
      observer = new IntersectionObserver(
        (entries) => {
          const visible = entries.filter((e) => e.isIntersecting).map((e) => pages.indexOf(e.target as HTMLElement))
          if (visible.length) report(Math.min(...visible))
        },
        { root: host, threshold: 0.5 }
      )
      pages.forEach((p) => observer!.observe(p))
      report(0)
    },
    setZoom(z) {
      doc.style.zoom = String(z)
    },
    search: (q, dir) => search.search(q, dir),
    clearSearch: () => search?.clear(),
    print: () => printNode(doc.cloneNode(true)),
    dispose() {
      observer?.disconnect()
      search?.clear()
    }
  }
}
