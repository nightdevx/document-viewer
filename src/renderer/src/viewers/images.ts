import { resolveRelative } from './paths'

function placeholder(text: string, title?: string): HTMLElement {
  const el = document.createElement('span')
  el.className = 'image-placeholder'
  el.textContent = text
  if (title) el.title = title
  return el
}

/** Images that fail to decode (EMF/WMF, broken data) become a labelled placeholder. */
export function guardImages(root: HTMLElement): void {
  for (const img of root.querySelectorAll('img')) {
    const swap = (): void => img.replaceWith(placeholder('Resim gösterilemiyor', img.alt || undefined))
    if (img.complete && img.naturalWidth === 0 && img.getAttribute('src')) swap()
    else img.addEventListener('error', swap, { once: true })
  }
}

/**
 * Remote images are blocked (no network from documents); relative ones are read from disk
 * next to the document and shown as blob URLs. Returns the blob URLs to revoke on dispose.
 */
export async function loadLocalImages(root: HTMLElement, docPath: string): Promise<string[]> {
  const urls: string[] = []
  await Promise.all(
    [...root.querySelectorAll('img')].map(async (img) => {
      const src = img.getAttribute('src') ?? ''
      if (src.startsWith('data:')) return
      img.removeAttribute('src')
      if (/^https?:/i.test(src)) return img.replaceWith(placeholder('Uzak resim engellendi', src))
      const path = resolveRelative(docPath, src)
      if (!path) return img.replaceWith(placeholder('Resim gösterilemiyor', src))
      try {
        const data = window.api
          ? (await window.api.readFile(path)).data
          : await (await fetch('/' + src)).arrayBuffer() // dev preview: test-files/
        const url = URL.createObjectURL(new Blob([data]))
        urls.push(url)
        img.src = url
      } catch {
        img.replaceWith(placeholder('Resim bulunamadı', src))
      }
    })
  )
  guardImages(root)
  return urls
}
