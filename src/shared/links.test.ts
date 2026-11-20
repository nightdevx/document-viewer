import { describe, expect, it } from 'vitest'
import { linkPolicy } from './links'

describe('linkPolicy', () => {
  it.each([
    ['https://nightdijital.com', 'external'],
    ['http://example.com/a?b=c', 'external'],
    ['mailto:a@b.com', 'external'],
    ['HTTPS://EXAMPLE.COM', 'external'],
    ['file:///C:/Windows/system32/calc.exe', 'ignore'],
    ['javascript:alert(1)', 'ignore'],
    ['ms-settings:defaultapps', 'ignore'],
    ['\\\\sunucu\\pay', 'ignore'],
    ['not a url', 'ignore'],
    ['', 'ignore']
  ])('%s -> %s', (href, expected) => {
    expect(linkPolicy(href)).toBe(expected)
  })
})
