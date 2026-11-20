import { describe, expect, it } from 'vitest'
import { extractFilePaths } from './args'

describe('extractFilePaths', () => {
  it('keeps document paths with Turkish characters, spaces and UNC paths', () => {
    const argv = ['C:\\app.exe', '--flag', 'C:\\Belgeler\\Çalışma Raporu.docx', '\\\\sunucu\\pay\\a.pdf']
    expect(extractFilePaths(argv, () => true)).toEqual([
      'C:\\Belgeler\\Çalışma Raporu.docx',
      '\\\\sunucu\\pay\\a.pdf'
    ])
  })

  it('always skips argv[0] even when it exists', () => {
    expect(extractFilePaths(['C:\\app.exe'], () => true)).toEqual([])
  })

  it('drops paths that do not exist as files', () => {
    const argv = ['electron.exe', '.', 'C:\\yok.pdf', 'C:\\var.pdf']
    expect(extractFilePaths(argv, (p) => p === 'C:\\var.pdf')).toEqual(['C:\\var.pdf'])
  })

  it('keeps several files in order', () => {
    const argv = ['app.exe', 'a.pdf', 'b.xlsx', 'c.md']
    expect(extractFilePaths(argv, () => true)).toEqual(['a.pdf', 'b.xlsx', 'c.md'])
  })
})
