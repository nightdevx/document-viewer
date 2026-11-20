import MarkdownIt from 'markdown-it'
import 'github-markdown-css/github-markdown.css'
import type { Viewer } from '../../../shared/types'
import { createDomSearch, type DomSearch } from '../shell/dom-search'
import { printNode } from '../shell/print'
import { highlight } from './highlight'
import { loadLocalImages } from './images'
import { decodeText } from './text-decode'

// html: false keeps raw HTML (and any <script>) in the file as plain text.
const md = new MarkdownIt({ html: false, linkify: true })

export function createMarkdownViewer(): Viewer {
  let doc: HTMLElement
  let search: DomSearch
  let blobs: string[] = []

  return {
    async mount(host, file) {
      doc = document.createElement('div')
      doc.className = 'doc-text md-doc'
      const body = document.createElement('article')
      body.className = 'markdown-body'
      body.innerHTML = md.render(decodeText(file.data))
      doc.append(body)
      await Promise.all(
        [...body.querySelectorAll('pre > code')].map(async (code) => {
          const lang = [...code.classList].find((c) => c.startsWith('language-'))?.slice(9)
          if (!lang) return
          const wrap = document.createElement('div')
          wrap.innerHTML = await highlight(code.textContent ?? '', lang)
          code.parentElement!.replaceWith(wrap.firstElementChild!)
        })
      )
      blobs = await loadLocalImages(body, file.path)
      host.replaceChildren(doc)
      search = createDomSearch(doc)
    },
    setZoom(z) {
      doc.style.zoom = String(z)
    },
    search: (q, dir) => search.search(q, dir),
    clearSearch: () => search?.clear(),
    print: () => printNode(doc.cloneNode(true)),
    dispose() {
      search?.clear()
      blobs.forEach((u) => URL.revokeObjectURL(u))
    }
  }
}
