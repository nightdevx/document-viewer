import { parseWorkbook, type WorkbookModel } from './model'

export type SheetRequest = { data: ArrayBuffer; ext: 'xlsx' | 'xls' | 'csv'; locale: string }
export type SheetReply = { ok: true; model: WorkbookModel } | { ok: false; message: string }

self.onmessage = async (e: MessageEvent<SheetRequest>) => {
  const { data, ext, locale } = e.data
  try {
    const model = await parseWorkbook(data, ext, locale)
    const images = model.sheets.flatMap((s) => s.images.map((i) => i.data))
    self.postMessage({ ok: true, model } satisfies SheetReply, { transfer: images })
  } catch (err) {
    self.postMessage({ ok: false, message: err instanceof Error ? err.message : String(err) } satisfies SheetReply)
  }
}
