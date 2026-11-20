import { app, BrowserWindow, dialog, ipcMain, Menu, protocol, session, shell, type IpcMainEvent, type IpcMainInvokeEvent } from 'electron'
import { statSync } from 'fs'
import { readFile } from 'fs/promises'
import { extname, join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import { mimeType, resolveAppPath } from './app-protocol'
import { extractFilePaths, OpenQueue } from './args'
import { readDocument } from './files'
import { linkPolicy } from '../shared/links'

const isFile = (p: string): boolean => {
  try {
    return statSync(p).isFile()
  } catch {
    return false
  }
}

const RENDERER_DIR = join(__dirname, '../renderer')
// DV_SMOKE=1: never show the window, print what the first document shows, then quit (packaged-build check).
const SMOKE = process.env.DV_SMOKE === '1'

let mainWindow: BrowserWindow | null = null
const queue = new OpenQueue((files) => mainWindow?.webContents.send('open-files', files))
queue.add(extractFilePaths(process.argv, isFile, process.cwd()))

// The renderer is served from app://bundle so CSP 'self' does not cover every file: URL.
protocol.registerSchemesAsPrivileged([
  { scheme: 'app', privileges: { standard: true, secure: true, supportFetchAPI: true, corsEnabled: true } }
])

if (!app.requestSingleInstanceLock()) {
  app.quit()
} else {
  app.on('second-instance', (_e, argv, workingDirectory) => {
    queue.add(extractFilePaths(argv, isFile, workingDirectory))
    if (!mainWindow) return
    if (mainWindow.isMinimized()) mainWindow.restore()
    mainWindow.focus()
  })
  app.whenReady().then(start)
}

function createWindow(): BrowserWindow {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    show: false,
    autoHideMenuBar: true,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      sandbox: true,
      nodeIntegration: false
    }
  })

  if (!SMOKE) win.on('ready-to-show', () => win.show())

  // Documents never open new windows or navigate the app away.
  win.webContents.setWindowOpenHandler(() => ({ action: 'deny' }))
  win.webContents.on('will-navigate', (event) => event.preventDefault())
  // A document that exhausts the renderer (zip bomb, huge sheet) costs the open tabs, not the app.
  win.webContents.on('render-process-gone', (_e, details) => {
    if (details.reason !== 'clean-exit') win.reload()
  })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    win.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    win.loadURL('app://bundle/index.html')
  }
  return win
}

function start(): void {
  // No app menu: its default zoom/reload accelerators would act on the whole window.
  Menu.setApplicationMenu(null)
  electronApp.setAppUserModelId('com.nightdijital.documentviewer')
  app.on('browser-window-created', (_, window) => optimizer.watchWindowShortcuts(window))

  // Read from disk directly: net.fetch(file:) would hit the file: block below.
  protocol.handle('app', async (req) => {
    const file = resolveAppPath(RENDERER_DIR, new URL(req.url).pathname)
    if (!file) return new Response('Not found', { status: 404 })
    try {
      return new Response(await readFile(file), { headers: { 'content-type': mimeType(extname(file)) } })
    } catch {
      return new Response('Not found', { status: 404 })
    }
  })
  // Nothing in the renderer needs file: URLs; refusing them also stops UNC (SMB) requests from documents.
  session.defaultSession.webRequest.onBeforeRequest({ urls: ['file://*/*'] }, (_d, cb) => cb({ cancel: true }))

  // Only the app's own top frame may use the IPC surface.
  const trusted = (e: IpcMainEvent | IpcMainInvokeEvent): boolean => e.senderFrame === mainWindow?.webContents.mainFrame

  // IPC errors lose custom fields, so read errors travel as values.
  ipcMain.handle('read-file', async (e, path: string, opts?: { allowLarge?: boolean }) => {
    if (!trusted(e)) return { ok: false, code: 'ACCESS_DENIED' }
    try {
      return { ok: true, file: await readDocument(path, { allowLarge: opts?.allowLarge }) }
    } catch (err) {
      const r = err as { code?: string; size?: number }
      return { ok: false, code: r.code ?? 'UNKNOWN', size: r.size }
    }
  })
  ipcMain.handle('initial-files', (e) => (trusted(e) ? queue.drain() : []))
  ipcMain.handle('open-dialog', async (e) => {
    if (!trusted(e)) return []
    const r = await dialog.showOpenDialog(mainWindow!, { properties: ['openFile', 'multiSelections'] })
    return r.canceled ? [] : r.filePaths
  })
  ipcMain.on('open-external', (e, url: string) => {
    if (trusted(e) && linkPolicy(url) === 'external') shell.openExternal(url)
  })
  ipcMain.handle('print', (e) => (trusted(e) ? new Promise<void>((resolve) => e.sender.print({}, () => resolve())) : undefined))
  ipcMain.on('open-default-apps', (e) => trusted(e) && shell.openExternal('ms-settings:defaultapps'))

  mainWindow = createWindow()
  if (SMOKE) smoke(mainWindow)
}

function smoke(win: BrowserWindow): void {
  win.webContents.once('did-finish-load', () => {
    setTimeout(async () => {
      const result = await win.webContents.executeJavaScript(
        `JSON.stringify({ position: document.getElementById('status-position').textContent,
          info: document.getElementById('status-info').textContent,
          error: document.querySelector('.error-screen')?.textContent ?? null,
          url: location.href })`
      )
      process.stdout.write(`DV_SMOKE ${result}\n`)
      app.exit(0)
    }, Number(process.env.DV_SMOKE_WAIT ?? 6000))
  })
}

app.on('window-all-closed', () => app.quit())
