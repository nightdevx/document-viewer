import { readFile, stat } from 'fs/promises'
import { basename, extname } from 'path'
import { LARGE_FILE_BYTES, type OpenedFile, type ReadErrorCode } from '../shared/types'

type ReadError = Error & { code: ReadErrorCode; size?: number }

function fail(code: ReadErrorCode, size?: number): ReadError {
  return Object.assign(new Error(code), { code, size })
}

const codes: Record<string, ReadErrorCode> = { ENOENT: 'NOT_FOUND', EACCES: 'ACCESS_DENIED', EPERM: 'ACCESS_DENIED' }

export async function readDocument(
  path: string,
  opts: { allowLarge?: boolean; limit?: number } = {}
): Promise<OpenedFile> {
  try {
    const info = await stat(path)
    if (!info.isFile()) throw fail('UNKNOWN')
    if (info.size > (opts.limit ?? LARGE_FILE_BYTES) && !opts.allowLarge) throw fail('TOO_LARGE', info.size)
    const buf = await readFile(path)
    return {
      path,
      name: basename(path),
      ext: extname(path).slice(1).toLowerCase(),
      size: buf.byteLength,
      data: buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer
    }
  } catch (e) {
    const err = e as NodeJS.ErrnoException & { size?: number }
    if (err.code === 'TOO_LARGE' || err.code === 'UNKNOWN') throw err
    throw fail(codes[err.code ?? ''] ?? 'UNKNOWN')
  }
}
