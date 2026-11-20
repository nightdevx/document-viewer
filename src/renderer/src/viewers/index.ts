import type { OpenedFile, Viewer } from '../../../shared/types'
import { pickViewer } from './registry'
import { createUnsupportedViewer } from './unsupported'

/** Heavy viewers are imported on first use so cold start only pays for the shell. */
export async function createViewer(file: OpenedFile): Promise<Viewer> {
  switch (pickViewer(file.ext)) {
    case 'code':
      return (await import('./code')).createCodeViewer()
    case 'pdf':
      return (await import('./pdf')).createPdfViewer()
    case 'sheet':
      return (await import('./sheet/grid')).createSheetViewer()
    case 'docx':
      return (await import('./docx')).createDocxViewer()
    case 'pptx':
      return (await import('./pptx')).createPptxViewer()
    case 'markdown':
      return (await import('./markdown')).createMarkdownViewer()
    case 'unsupported':
      return createUnsupportedViewer('Bu format desteklenmiyor. Word için .docx, PowerPoint için .pptx kullan.')
  }
}
