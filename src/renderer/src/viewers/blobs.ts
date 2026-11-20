/** blob: URLs a rendered document holds (img/video/audio src, CSS url()), so dispose can revoke them. */
export function collectBlobUrls(root: HTMLElement): string[] {
  const urls = new Set<string>()
  for (const el of root.querySelectorAll('[src^="blob:"]')) urls.add(el.getAttribute('src')!)
  const css = [...root.querySelectorAll('style')].map((s) => s.textContent ?? '').join('\n') +
    [...root.querySelectorAll<HTMLElement>('[style*="blob:"]')].map((e) => e.getAttribute('style')).join('\n')
  for (const m of css.matchAll(/url\(\s*["']?(blob:[^"')\s]+)/g)) urls.add(m[1])
  return [...urls]
}

export const revokeBlobUrls = (root: HTMLElement | undefined): void => {
  if (root) collectBlobUrls(root).forEach((u) => URL.revokeObjectURL(u))
}
