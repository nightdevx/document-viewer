import JSZip from 'jszip'
import { describe, expect, it } from 'vitest'
import { checkZipSize, detectContainer, officeContainerError } from './sniff'

const bytes = (...b: number[]): ArrayBuffer => new Uint8Array(b).buffer
const text = (s: string): ArrayBuffer => new TextEncoder().encode(s).buffer as ArrayBuffer

async function zipWith(content: string): Promise<ArrayBuffer> {
  const z = new JSZip()
  z.file('word/document.xml', content)
  return z.generateAsync({ type: 'arraybuffer', compression: 'DEFLATE' })
}

describe('detectContainer', () => {
  it('recognises zip, cfb, pdf and other', () => {
    expect(detectContainer(bytes(0x50, 0x4b, 0x03, 0x04, 0))).toBe('zip')
    expect(detectContainer(bytes(0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1))).toBe('cfb')
    expect(detectContainer(text('%PDF-1.7\n'))).toBe('pdf')
    expect(detectContainer(text('<html>'))).toBe('other')
    expect(detectContainer(new ArrayBuffer(0))).toBe('other')
  })
})

describe('checkZipSize', () => {
  it('accepts a small zip', async () => {
    const zip = await zipWith('a'.repeat(1000))
    expect(() => checkZipSize(zip)).not.toThrow()
  })

  it('rejects when the uncompressed total exceeds the limit', async () => {
    const zip = await zipWith('a'.repeat(1000))
    expect(() => checkZipSize(zip, 10)).toThrow('ZIP_TOO_LARGE')
  })

  it('rejects data without a zip directory', () => {
    expect(() => checkZipSize(text('not a zip at all'))).toThrow('ZIP_CORRUPT')
  })
})

describe('officeContainerError', () => {
  it('explains encrypted or legacy office files', () => {
    expect(officeContainerError(bytes(0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1))).toBe(
      'Dosya şifreli ya da eski Office formatında.'
    )
  })

  it('explains a file that is not a zip', () => {
    expect(officeContainerError(text('%PDF-1.7'))).toBe('Dosya bozuk ya da uzantısı yanlış.')
  })

  it('returns null for a zip', async () => {
    expect(officeContainerError(await zipWith('x'))).toBeNull()
  })
})
