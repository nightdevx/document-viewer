/** Document paths from a command line: argv[0] (the exe) and flags are skipped, `exists` must be true for a file. */
export function extractFilePaths(argv: string[], exists: (p: string) => boolean): string[] {
  return argv.slice(1).filter((a) => !a.startsWith('-') && exists(a))
}
