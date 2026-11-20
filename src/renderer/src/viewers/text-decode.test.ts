import { describe, expect, it } from 'vitest'
import { decodeText, isBinary } from './text-decode'

const buf = (...b: number[]): ArrayBuffer => new Uint8Array(b).buffer

describe('decodeText', () => {
  it('decodes UTF-8 with Turkish letters', () => {
    const data = new TextEncoder().encode('şğüİı').buffer as ArrayBuffer
    expect(decodeText(data)).toBe('şğüİı')
  })

  it('strips a UTF-8 BOM', () => {
    expect(decodeText(buf(0xef, 0xbb, 0xbf, 0x61))).toBe('a')
  })

  it('decodes UTF-16 LE with BOM', () => {
    expect(decodeText(buf(0xff, 0xfe, 0x5f, 0x01, 0x61, 0x00))).toBe('şa')
  })

  it('decodes UTF-16 BE with BOM', () => {
    expect(decodeText(buf(0xfe, 0xff, 0x01, 0x5f, 0x00, 0x61))).toBe('şa')
  })

  it('falls back to Windows-1254 when the bytes are not valid UTF-8', () => {
    // "Şirket ış" in Windows-1254
    expect(decodeText(buf(0xde, 0x69, 0x72, 0x6b, 0x65, 0x74, 0x20, 0xfd, 0xfe))).toBe('Şirket ış')
  })
})

describe('isBinary', () => {
  it('flags NUL bytes in the first 8 KB', () => {
    expect(isBinary(buf(0x4d, 0x5a, 0x00, 0x01))).toBe(true)
  })

  it('accepts plain text', () => {
    expect(isBinary(new TextEncoder().encode('merhaba\n').buffer as ArrayBuffer)).toBe(false)
  })

  it('accepts UTF-16 text with a BOM even though it has NUL bytes', () => {
    expect(isBinary(buf(0xff, 0xfe, 0x61, 0x00))).toBe(false)
  })
})
