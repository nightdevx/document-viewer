import { resolve } from 'path'
import { defineConfig } from 'electron-vite'

export default defineConfig(({ command }) => ({
  main: {},
  preload: {},
  renderer: {
    define: {
      // Dev-only loader for test-files/; empty in production builds.
      __TEST_FILES_DIR__: JSON.stringify(command === 'serve' ? resolve('test-files').split('\\').join('/') : '')
    }
  }
}))
