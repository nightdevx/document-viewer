import type { ViewerKind } from '../../../shared/types'

const kinds: Record<string, ViewerKind> = {
  pdf: 'pdf',
  docx: 'docx',
  xlsx: 'sheet',
  xls: 'sheet',
  csv: 'sheet',
  pptx: 'pptx',
  md: 'markdown',
  markdown: 'markdown',
  doc: 'unsupported',
  ppt: 'unsupported'
}

/** Unknown extensions go to the code viewer, which rejects binary content itself. */
export function pickViewer(ext: string): ViewerKind {
  return kinds[ext.toLowerCase()] ?? 'code'
}
