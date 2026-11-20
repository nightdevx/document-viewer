// Renderer in a plain browser, without Electron, for headless screenshots:
//   npx vite --config scripts/preview.vite.config.ts
// then open http://localhost:5174/?open=sample.pdf (files come from test-files/).
import { resolve } from 'path'
import { defineConfig } from 'vite'

export default defineConfig({
  root: resolve(__dirname, '../src/renderer'),
  server: { port: 5174, strictPort: true, fs: { allow: [resolve(__dirname, '..')] } },
  define: { __TEST_FILES_DIR__: JSON.stringify(resolve(__dirname, '../test-files').split('\\').join('/')) }
})
