/** Windows path of `rel` relative to the folder of `docPath`; null for URLs and root-relative paths. */
export function resolveRelative(docPath: string, rel: string): string | null {
  if (/^[a-z][a-z0-9+.-]*:/i.test(rel) || rel.startsWith('/') || rel.startsWith('\\')) return null
  let decoded: string
  try {
    decoded = decodeURI(rel)
  } catch {
    decoded = rel
  }
  const parts = docPath.split(/[\\/]/).slice(0, -1)
  const root = parts.length ? 1 : 0 // the drive ("C:") or UNC head stays
  for (const seg of decoded.split(/[\\/]/)) {
    if (seg === '..') {
      if (parts.length > root) parts.pop()
    } else if (seg && seg !== '.') {
      parts.push(seg)
    }
  }
  return parts.join('\\')
}
