import type { Viewer } from '../../../shared/types'
import { createDomSearch, type DomSearch } from '../shell/dom-search'
import { printNode } from '../shell/print'
import { emitStatus } from '../shell/status'
import { highlight, languageFor } from './highlight'
import { decodeText, isBinary } from './text-decode'

const PLAIN_ABOVE = 5 * 1024 * 1024

export function createCodeViewer(): Viewer {
  let doc: HTMLElement
  let search: DomSearch

  return {
    async mount(host, file) {
      if (isBinary(file.data)) throw new Error('Bu dosya metin değil, görüntülenemiyor.')
      const text = decodeText(file.data)
      doc = document.createElement('div')
      doc.className = 'doc-text code-doc'
      if (file.size > PLAIN_ABOVE) {
        // ponytail: one big <pre>, no colours or line numbers; virtual scrolling if this ever lags.
        const pre = document.createElement('pre')
        pre.className = 'plain'
        pre.textContent = text
        doc.append(pre)
      } else {
        doc.innerHTML = await highlight(text, file.ext)
      }
      host.replaceChildren(doc)
      search = createDomSearch(doc)
      const lines = text.split('\n').length
      const lang = languageFor(file.ext)
      emitStatus(host, {
        position: `${lines.toLocaleString('tr-TR')} satır`,
        info: lang === 'text' ? 'Düz metin' : lang
      })
    },
    setZoom(z) {
      doc.style.zoom = String(z)
    },
    search: (q, dir) => search.search(q, dir),
    clearSearch: () => search?.clear(),
    print: () => printNode(doc.cloneNode(true)),
    dispose() {
      search?.clear()
    }
  }
}
