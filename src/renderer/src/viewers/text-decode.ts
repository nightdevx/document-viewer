/** BOM first, then strict UTF-8, then Windows-1254 (Turkish legacy files). */
export function decodeText(buf: ArrayBuffer): string {
  const b = new Uint8Array(buf, 0, Math.min(3, buf.byteLength))
  if (b[0] === 0xef && b[1] === 0xbb && b[2] === 0xbf) return new TextDecoder('utf-8').decode(buf.slice(3))
  if (b[0] === 0xff && b[1] === 0xfe) return new TextDecoder('utf-16le').decode(buf.slice(2))
  if (b[0] === 0xfe && b[1] === 0xff) return new TextDecoder('utf-16be').decode(buf.slice(2))
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(buf)
  } catch {
    return new TextDecoder('windows-1254').decode(buf)
  }
}

/** NUL bytes in the first 8 KB mean binary, unless a UTF-16 BOM explains them. */
export function isBinary(buf: ArrayBuffer): boolean {
  const b = new Uint8Array(buf, 0, Math.min(8192, buf.byteLength))
  if ((b[0] === 0xff && b[1] === 0xfe) || (b[0] === 0xfe && b[1] === 0xff)) return false
  return b.includes(0)
}
