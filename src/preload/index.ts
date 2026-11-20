import { contextBridge, ipcRenderer } from 'electron'
import type { Api, OpenedFile } from '../shared/types'

type ReadReply = { ok: true; file: OpenedFile } | { ok: false; code: string; size?: number }

const api: Api = {
  async readFile(path, opts) {
    const r: ReadReply = await ipcRenderer.invoke('read-file', path, opts)
    if (r.ok) return r.file
    throw Object.assign(new Error(r.code), { code: r.code, size: r.size })
  },
  openDialog: () => ipcRenderer.invoke('open-dialog'),
  onOpenFiles(cb) {
    ipcRenderer.on('open-files', (_e, paths: string[]) => cb(paths))
    ipcRenderer.invoke('initial-files').then((paths: string[]) => paths.length && cb(paths))
  },
  openExternal: (url) => ipcRenderer.send('open-external', url),
  print: () => ipcRenderer.invoke('print'),
  openDefaultAppsSettings: () => ipcRenderer.send('open-default-apps')
}

contextBridge.exposeInMainWorld('api', api)
