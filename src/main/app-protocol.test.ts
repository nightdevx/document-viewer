import { describe, expect, it } from 'vitest'
import { resolveAppPath } from './app-protocol'

describe('resolveAppPath', () => {
  const root = 'C:\\app\\out\\renderer'

  it('maps app URLs to files inside the renderer folder', () => {
    expect(resolveAppPath(root, '/index.html')).toBe('C:\\app\\out\\renderer\\index.html')
    expect(resolveAppPath(root, '/pdfjs/cmaps/H%20X.bcmap')).toBe('C:\\app\\out\\renderer\\pdfjs\\cmaps\\H X.bcmap')
  })

  it('refuses paths that escape the folder', () => {
    expect(resolveAppPath(root, '/../main/index.js')).toBeNull()
    expect(resolveAppPath(root, '/%2e%2e/%2e%2e/secret.txt')).toBeNull()
    expect(resolveAppPath(root, '/..%5c..%5csecret.txt')).toBeNull()
  })
})

describe('mimeType', () => {
  it('serves scripts, workers and wasm with the types browsers require', async () => {
    const { mimeType } = await import('./app-protocol')
    expect(mimeType('.mjs')).toBe('text/javascript')
    expect(mimeType('.JS')).toBe('text/javascript')
    expect(mimeType('.wasm')).toBe('application/wasm')
    expect(mimeType('.bcmap')).toBe('application/octet-stream')
  })
})
