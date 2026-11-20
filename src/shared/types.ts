export type OpenedFile = { path: string; name: string; ext: string; size: number; data: ArrayBuffer }

export type ReadErrorCode = 'NOT_FOUND' | 'ACCESS_DENIED' | 'TOO_LARGE' | 'UNKNOWN'

/** index is 0-based; total 0 means no match. */
export type SearchResult = { index: number; total: number }

export type ViewerKind = 'pdf' | 'docx' | 'sheet' | 'pptx' | 'markdown' | 'code' | 'unsupported'

export interface Viewer {
  /** Throwing here makes the shell show an error screen for this tab. */
  mount(host: HTMLElement, file: OpenedFile): Promise<void>
  /**
   * 1 = 100%, clamped by the shell to 0.25..5. `anchor` (client coordinates) is the point that must
   * stay put: the cursor for Ctrl+wheel, the viewport centre otherwise.
   */
  setZoom(scale: number, anchor?: { x: number; y: number }): void
  /**
   * Calling again with the same query moves to the next (1) or previous (-1) match.
   * Viewers whose count grows later (PDF) dispatch 'viewer-search' on their host with the new SearchResult.
   */
  search(query: string, dir: 1 | -1): SearchResult | Promise<SearchResult>
  clearSearch(): void
  /** Fills #print-root and calls api.print(). */
  print(): Promise<void>
  dispose(): void
}

export interface Api {
  readFile(path: string, opts?: { allowLarge?: boolean }): Promise<OpenedFile>
  openDialog(): Promise<string[]>
  onOpenFiles(cb: (paths: string[]) => void): void
  openExternal(url: string): void
  print(): Promise<void>
  openDefaultAppsSettings(): void
  /** Real disk path of a dropped File (Electron removed File.path). */
  pathForFile(file: File): string
  windowControl(action: 'minimize' | 'maximize' | 'close'): void
  onMaximizedChange(cb: (maximized: boolean) => void): void
}

export const LARGE_FILE_BYTES = 200 * 1024 * 1024
