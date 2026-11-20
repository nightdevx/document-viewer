/** Only web and mail links leave the app; everything else (file:, javascript:, custom schemes) is ignored. */
export function linkPolicy(href: string): 'external' | 'ignore' {
  try {
    const { protocol } = new URL(href)
    return ['http:', 'https:', 'mailto:'].includes(protocol) ? 'external' : 'ignore'
  } catch {
    return 'ignore'
  }
}
