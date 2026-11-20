import { app, BrowserWindow, dialog, ipcMain, Menu, shell } from 'electron'
import { statSync } from 'fs'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import { extractFilePaths } from './args'
import { readDocument } from './files'
import { linkPolicy } from '../shared/links'

const isFile = (p: string): boolean => {
  try {
    return statSync(p).isFile()
  } catch {
    return false
  }
}

let mainWindow: BrowserWindow | null = null
const initialFiles = extractFilePaths(process.argv, isFile)

if (!app.requestSingleInstanceLock()) {
  app.quit()
} else {
  app.on('second-instance', (_e, argv) => {
    if (!mainWindow) return
    if (mainWindow.isMinimized()) mainWindow.restore()
    mainWindow.focus()
    const files = extractFilePaths(argv, isFile)
    if (files.length) mainWindow.webContents.send('open-files', files)
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

  win.on('ready-to-show', () => win.show())

  // Documents never open new windows or navigate the app away.
  win.webContents.setWindowOpenHandler(() => ({ action: 'deny' }))
  win.webContents.on('will-navigate', (event) => event.preventDefault())

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    win.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    win.loadFile(join(__dirname, '../renderer/index.html'))
  }
  return win
}

function start(): void {
  // No app menu: its default zoom/reload accelerators would act on the whole window.
  Menu.setApplicationMenu(null)
  electronApp.setAppUserModelId('com.nightdijital.documentviewer')
  app.on('browser-window-created', (_, window) => optimizer.watchWindowShortcuts(window))

  // IPC errors lose custom fields, so read errors travel as values.
  ipcMain.handle('read-file', async (_e, path: string, opts?: { allowLarge?: boolean }) => {
    try {
      return { ok: true, file: await readDocument(path, { allowLarge: opts?.allowLarge }) }
    } catch (e) {
      const err = e as { code?: string; size?: number }
      return { ok: false, code: err.code ?? 'UNKNOWN', size: err.size }
    }
  })
  ipcMain.handle('initial-files', () => initialFiles)
  ipcMain.handle('open-dialog', async () => {
    const r = await dialog.showOpenDialog(mainWindow!, { properties: ['openFile', 'multiSelections'] })
    return r.canceled ? [] : r.filePaths
  })
  ipcMain.on('open-external', (_e, url: string) => {
    if (linkPolicy(url) === 'external') shell.openExternal(url)
  })
  ipcMain.handle(
    'print',
    (e) =>
      new Promise<void>((resolve) => e.sender.print({}, () => resolve()))
  )
  ipcMain.on('open-default-apps', () => shell.openExternal('ms-settings:defaultapps'))

  mainWindow = createWindow()
}

app.on('window-all-closed', () => app.quit())
