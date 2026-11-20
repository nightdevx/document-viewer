// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest'
import { collectBlobUrls } from './blobs'

describe('collectBlobUrls', () => {
  it('finds blob URLs in src attributes and in style text', () => {
    const root = document.createElement('div')
    root.innerHTML = `<img src="blob:app://bundle/1"><video src="blob:app://bundle/2"></video>
      <style>@font-face { src: url(blob:app://bundle/3) } .x { background: url("blob:app://bundle/4") }</style>
      <img src="data:image/png;base64,AA"><span style="background-image:url(blob:app://bundle/5)"></span>`
    expect(collectBlobUrls(root).sort()).toEqual([1, 2, 3, 4, 5].map((n) => `blob:app://bundle/${n}`))
  })
})
