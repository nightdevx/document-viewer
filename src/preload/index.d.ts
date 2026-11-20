import type { Api } from '../shared/types'

declare global {
  interface Window {
    /** Missing when the renderer runs in a plain browser (dev screenshots). */
    api?: Api
  }
}

export {}
