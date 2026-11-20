// Fixes for what docx-preview leaves out, applied as extra CSS after rendering.

// Word always writes the "w:" prefix; qualified names also work where namespace lookups do not.
const attr = (el: Element, name: string): string | null => el.getAttribute(`w:${name}`)
const child = (el: Element, name: string): Element | undefined => el.getElementsByTagName(`w:${name}`)[0]

/** docx-preview's class for a style id (see its escapeClassName). */
const styleClass = (id: string): string =>
  `docx_${id.replace(/[ .]+/g, '-').replace(/[&]+/g, 'and').toLowerCase()}`
    // Style ids come from the document: escape everything that could end the selector.
    .replace(/[^\w-]/g, (ch) => '\\' + ch)

/**
 * Word's "don't add space between paragraphs of the same style" (w:contextualSpacing), which
 * docx-preview ignores. List styles use it, so without this every list item gets a gap.
 */
export function contextualSpacingCss(stylesXml: string): string {
  if (!stylesXml) return ''
  const doc = new DOMParser().parseFromString(stylesXml, 'application/xml')
  if (doc.getElementsByTagName('parsererror').length) return ''
  const own = new Map<string, boolean | undefined>()
  const basedOn = new Map<string, string>()
  for (const s of doc.getElementsByTagName('w:style')) {
    const id = attr(s, 'styleId')
    if (!id || attr(s, 'type') !== 'paragraph') continue
    const cs = child(s, 'contextualSpacing')
    own.set(id, cs ? !['0', 'false', 'off'].includes(attr(cs, 'val') ?? '') : undefined)
    const base = child(s, 'basedOn')
    if (base) basedOn.set(id, attr(base, 'val') ?? '')
  }
  const resolve = (id: string, depth = 0): boolean => {
    const v = own.get(id)
    if (v !== undefined) return v
    const base = basedOn.get(id)
    return base && depth < 20 ? resolve(base, depth + 1) : false
  }
  return [...own.keys()]
    .filter((id) => resolve(id))
    .map((id) => {
      const c = styleClass(id)
      return `.docx p.${c}:has(+ p.${c}) { margin-bottom: 0 !important; }\n.docx p.${c} + p.${c} { margin-top: 0 !important; }`
    })
    .join('\n')
}
