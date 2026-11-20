import { describe, expect, it } from 'vitest'
import { pickViewer } from './registry'

describe('pickViewer', () => {
  it.each([
    ['pdf', 'pdf'],
    ['PDF', 'pdf'],
    ['docx', 'docx'],
    ['xlsx', 'sheet'],
    ['xls', 'sheet'],
    ['csv', 'sheet'],
    ['pptx', 'pptx'],
    ['md', 'markdown'],
    ['markdown', 'markdown'],
    ['doc', 'unsupported'],
    ['ppt', 'unsupported'],
    ['ts', 'code'],
    ['txt', 'code'],
    ['', 'code'],
    ['bilinmeyen', 'code']
  ])('%s -> %s', (ext, kind) => {
    expect(pickViewer(ext)).toBe(kind)
  })
})
