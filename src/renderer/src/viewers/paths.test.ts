import { describe, expect, it } from 'vitest'
import { resolveRelative } from './paths'

describe('resolveRelative', () => {
  it('resolves a path next to the document', () => {
    expect(resolveRelative('C:\\docs\\a\\readme.md', 'img/x.png')).toBe('C:\\docs\\a\\img\\x.png')
  })

  it('handles ./ and ../ and URL escapes', () => {
    expect(resolveRelative('C:\\docs\\a\\readme.md', './../b/y%20z.png')).toBe('C:\\docs\\b\\y z.png')
  })

  it('refuses URLs with a scheme and root-relative paths', () => {
    expect(resolveRelative('C:\\docs\\readme.md', 'https://x.com/a.png')).toBeNull()
    expect(resolveRelative('C:\\docs\\readme.md', 'file:///C:/a.png')).toBeNull()
    expect(resolveRelative('C:\\docs\\readme.md', '/a.png')).toBeNull()
  })

  it('cannot climb above the drive root', () => {
    expect(resolveRelative('C:\\readme.md', '../../a.png')).toBe('C:\\a.png')
  })
})
