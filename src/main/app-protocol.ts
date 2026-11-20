import { normalize, sep } from 'path'

/**
 * File inside `root` for an app:// URL path, or null when the decoded path would leave `root`.
 * Serving the renderer from app:// (not file://) keeps CSP 'self' from matching every file: URL.
 */
export function resolveAppPath(root: string, urlPath: string): string | null {
  let decoded: string
  try {
    decoded = decodeURIComponent(urlPath)
  } catch {
    return null
  }
  const full = normalize(root + sep + decoded.replace(/^[\\/]+/, ''))
  return full.startsWith(normalize(root) + sep) ? full : null
}

const TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript',
  '.mjs': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.wasm': 'application/wasm',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf'
}

/** Content type for renderer assets; module scripts and workers need a JavaScript type. */
export const mimeType = (ext: string): string => TYPES[ext.toLowerCase()] ?? 'application/octet-stream'
