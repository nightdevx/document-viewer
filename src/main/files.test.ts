import { mkdtempSync, writeFileSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'
import { describe, expect, it } from 'vitest'
import { readDocument } from './files'

const dir = mkdtempSync(join(tmpdir(), 'dv-files-'))

describe('readDocument', () => {
  it('reads a file with name, lowercase extension, size and data', async () => {
    const p = join(dir, 'Çalışma Raporu.PDF')
    writeFileSync(p, 'abc')
    const f = await readDocument(p)
    expect(f.name).toBe('Çalışma Raporu.PDF')
    expect(f.ext).toBe('pdf')
    expect(f.size).toBe(3)
    expect(new TextDecoder().decode(f.data)).toBe('abc')
  })

  it('maps a missing file to NOT_FOUND', async () => {
    await expect(readDocument(join(dir, 'yok.pdf'))).rejects.toMatchObject({ code: 'NOT_FOUND' })
  })

  it('refuses files above the limit with TOO_LARGE and the size', async () => {
    const p = join(dir, 'buyuk.txt')
    writeFileSync(p, '12345')
    await expect(readDocument(p, { limit: 4 })).rejects.toMatchObject({ code: 'TOO_LARGE', size: 5 })
  })

  it('reads large files when allowLarge is set', async () => {
    const p = join(dir, 'buyuk2.txt')
    writeFileSync(p, '12345')
    const f = await readDocument(p, { limit: 4, allowLarge: true })
    expect(f.size).toBe(5)
  })

  it('maps a directory to UNKNOWN instead of crashing', async () => {
    await expect(readDocument(dir)).rejects.toMatchObject({ code: 'UNKNOWN' })
  })
})
