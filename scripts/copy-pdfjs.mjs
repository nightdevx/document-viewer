// Copies pdf.js runtime data (CMaps, standard fonts, WASM decoders, ICC profiles) into the
// renderer's public folder so they ship with the app and load without network access.
import { cpSync, rmSync } from 'fs'
import { resolve } from 'path'

const src = resolve(import.meta.dirname, '../node_modules/pdfjs-dist')
const dest = resolve(import.meta.dirname, '../src/renderer/public/pdfjs')
rmSync(dest, { recursive: true, force: true })
for (const dir of ['cmaps', 'standard_fonts', 'wasm', 'iccs']) {
  cpSync(resolve(src, dir), resolve(dest, dir), { recursive: true })
}
