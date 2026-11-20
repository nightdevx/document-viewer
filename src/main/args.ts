import { isAbsolute, resolve } from 'path'

/**
 * Document paths from a command line: argv[0] (the exe) and flags are skipped, relative paths are
 * resolved against the launching directory, and `exists` must be true for a file.
 */
export function extractFilePaths(argv: string[], exists: (p: string) => boolean, cwd?: string): string[] {
  return argv
    .slice(1)
    .filter((a) => !a.startsWith('-'))
    .map((a) => (cwd && !isAbsolute(a) ? resolve(cwd, a) : a))
    .filter(exists)
}

/**
 * Explorer starts one process per selected file; their paths can arrive before the renderer listens.
 * Paths wait here until the renderer drains them, and go straight to `send` afterwards.
 */
export class OpenQueue {
  private waiting: string[] = []
  private ready = false

  constructor(private send: (files: string[]) => void) {}

  add(files: string[]): void {
    if (!files.length) return
    if (this.ready) this.send(files)
    else this.waiting.push(...files)
  }

  drain(): string[] {
    this.ready = true
    return this.waiting.splice(0)
  }
}
