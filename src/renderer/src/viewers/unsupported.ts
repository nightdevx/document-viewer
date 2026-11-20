import type { Viewer } from '../../../shared/types'
import { unsupportedScreen } from '../shell/screens'

export function createUnsupportedViewer(detail?: string): Viewer {
  return {
    async mount(host, file) {
      host.replaceChildren(unsupportedScreen(file.name, detail))
    },
    setZoom() {},
    search: () => ({ index: 0, total: 0 }),
    clearSearch() {},
    async print() {},
    dispose() {}
  }
}
