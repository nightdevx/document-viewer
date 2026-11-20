export type Container = 'zip' | 'cfb' | 'pdf' | 'other'

const startsWith = (b: Uint8Array, sig: number[]): boolean => sig.every((v, i) => b[i] === v)

export function detectContainer(buf: ArrayBuffer): Container {
  const b = new Uint8Array(buf, 0, Math.min(8, buf.byteLength))
  if (startsWith(b, [0x50, 0x4b, 0x03, 0x04])) return 'zip'
  if (startsWith(b, [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1])) return 'cfb'
  if (startsWith(b, [0x25, 0x50, 0x44, 0x46])) return 'pdf'
  return 'other'
}

/** Message for a docx/xlsx/pptx whose bytes are not a zip, or null when it is one. */
export function officeContainerError(buf: ArrayBuffer): string | null {
  const c = detectContainer(buf)
  if (c === 'zip') return null
  if (c === 'cfb') return 'Dosya şifreli ya da eski Office formatında.'
  return 'Dosya bozuk ya da uzantısı yanlış.'
}

/**
 * Zip-bomb guard: sums the uncompressed sizes in the central directory and throws
 * ZIP_TOO_LARGE above maxTotal. ZIP64 markers are treated as too large; Office files never need them.
 * ponytail: trusts the declared sizes; a zip that lies about them is inflated in full by JSZip.
 * The renderer reloads if that exhausts memory (render-process-gone); stream-inflate with a cap if it matters.
 */
export function checkZipSize(buf: ArrayBuffer, maxTotal = 1_000_000_000): void {
  const v = new DataView(buf)
  const corrupt = (): Error => new Error('ZIP_CORRUPT')
  let eocd = -1
  for (let i = buf.byteLength - 22; i >= Math.max(0, buf.byteLength - 22 - 0xffff); i--) {
    if (v.getUint32(i, true) === 0x06054b50) {
      eocd = i
      break
    }
  }
  if (eocd < 0) throw corrupt()
  let p = v.getUint32(eocd + 16, true)
  if (p === 0xffffffff) throw new Error('ZIP_TOO_LARGE')
  // Walk headers by signature: the entry count in the end record can understate what a reader inflates.
  let total = 0
  while (p + 46 <= eocd && v.getUint32(p, true) === 0x02014b50) {
    const size = v.getUint32(p + 24, true)
    if (size === 0xffffffff) throw new Error('ZIP_TOO_LARGE')
    total += size
    if (total > maxTotal) throw new Error('ZIP_TOO_LARGE')
    p += 46 + v.getUint16(p + 28, true) + v.getUint16(p + 30, true) + v.getUint16(p + 32, true)
  }
  if (p === v.getUint32(eocd + 16, true)) throw corrupt()
}
