// Renderer in a plain browser, without Electron, for headless screenshots:
//   npx vite --config scripts/preview.vite.config.ts
// then open http://localhost:5174/?open=sample.pdf (files are served raw from test-files/).
import { resolve } from 'path'
import { defineConfig } from 'vite'

export default defineConfig({
  root: resolve(__dirname, '../src/renderer'),
  publicDir: resolve(__dirname, '../test-files'),
  server: { port: 5174, strictPort: true }
})
