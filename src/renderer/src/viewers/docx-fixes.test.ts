// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest'
import { contextualSpacingCss } from './docx-fixes'

const W = 'xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"'
const styles = `<w:styles ${W}>
  <w:style w:type="paragraph" w:styleId="ListParagraph"><w:pPr><w:contextualSpacing/></w:pPr></w:style>
  <w:style w:type="paragraph" w:styleId="List Number"><w:basedOn w:val="ListParagraph"/></w:style>
  <w:style w:type="paragraph" w:styleId="Normal"><w:pPr><w:spacing w:after="160"/></w:pPr></w:style>
  <w:style w:type="paragraph" w:styleId="Off"><w:basedOn w:val="ListParagraph"/><w:pPr><w:contextualSpacing w:val="0"/></w:pPr></w:style>
</w:styles>`

describe('contextualSpacingCss', () => {
  it('removes spacing between consecutive paragraphs of styles with contextual spacing, inherited through basedOn', () => {
    const css = contextualSpacingCss(styles)
    expect(css).toContain('p.docx_listparagraph + p.docx_listparagraph')
    expect(css).toContain('p.docx_list-number + p.docx_list-number')
    expect(css).not.toContain('docx_normal')
    expect(css).not.toContain('docx_off')
  })

  it('returns nothing for missing or broken XML', () => {
    expect(contextualSpacingCss('')).toBe('')
    expect(contextualSpacingCss('<not xml')).toBe('')
  })
})
