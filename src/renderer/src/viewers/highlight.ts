import { createHighlighterCore, type HighlighterCore } from 'shiki/core'
import { createJavaScriptRegexEngine } from 'shiki/engine/javascript'
import { bundledLanguages } from 'shiki/langs'

// JS regex engine: no WebAssembly, so the CSP needs no 'wasm-unsafe-eval'.
let highlighter: Promise<HighlighterCore> | null = null

const getHighlighter = (): Promise<HighlighterCore> =>
  (highlighter ??= createHighlighterCore({
    themes: [import('shiki/themes/github-light-default.mjs'), import('shiki/themes/github-dark-default.mjs')],
    langs: [],
    engine: createJavaScriptRegexEngine({ forgiving: true })
  }))

const aliases: Record<string, string> = {
  h: 'c',
  hpp: 'cpp',
  cc: 'cpp',
  rs: 'rust',
  py: 'python',
  rb: 'ruby',
  cs: 'csharp',
  sh: 'bash',
  ps1: 'powershell',
  psm1: 'powershell',
  bat: 'bat',
  cmd: 'bat',
  yml: 'yaml',
  htm: 'html',
  js: 'javascript',
  mjs: 'javascript',
  cjs: 'javascript',
  ts: 'typescript',
  md: 'markdown',
  kt: 'kotlin',
  ini: 'ini',
  log: 'log'
}

/** shiki language id for a file extension or fence name, or 'text' when unknown. */
export function languageFor(name: string): string {
  const id = aliases[name.toLowerCase()] ?? name.toLowerCase()
  return id in bundledLanguages ? id : 'text'
}

/** Highlighted HTML (<pre class="shiki">) with light and dark colours as CSS variables. */
export async function highlight(code: string, lang: string): Promise<string> {
  const h = await getHighlighter()
  const id = languageFor(lang)
  if (id !== 'text' && !h.getLoadedLanguages().includes(id)) {
    await h.loadLanguage(bundledLanguages[id as keyof typeof bundledLanguages])
  }
  return h.codeToHtml(code, {
    lang: id,
    themes: { light: 'github-light-default', dark: 'github-dark-default' },
    defaultColor: false
  })
}
