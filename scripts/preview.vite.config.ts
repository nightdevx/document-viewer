// Renderer in a plain browser, without Electron, for headless screenshots:
//   npx vite --config scripts/preview.vite.config.ts
// then open http://localhost:5174/?open=sample.pdf (files are served raw from test-files/).
import { createReadStream, existsSync } from 'fs'
import { resolve } from 'path'
import { defineConfig } from 'vite'

const testFiles = resolve(__dirname, '../test-files')

export default defineConfig({
  root: resolve(__dirname, '../src/renderer'),
  server: { port: 5174, strictPort: true },
  plugins: [
    {
      name: 'raw-test-files',
      configureServer(server) {
        server.middlewares.use('/test-files/', (req, res, next) => {
          const file = resolve(testFiles, decodeURIComponent((req.url ?? '').split('?')[0].slice(1)))
          if (!file.startsWith(testFiles) || !existsSync(file)) return next()
          createReadStream(file).pipe(res)
        })
      }
    }
  ]
})
