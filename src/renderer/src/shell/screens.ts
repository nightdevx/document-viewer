import { createElement, FileQuestion, TriangleAlert, type IconNode } from 'lucide'

function screen(cls: string, icon: IconNode, title: string, lines: string[]): HTMLElement {
  const el = document.createElement('div')
  el.className = `message-screen ${cls}`
  const box = document.createElement('div')
  box.className = 'message-box'
  const h = document.createElement('h2')
  h.textContent = title
  box.append(createElement(icon, { 'aria-hidden': 'true', class: 'message-icon' }), h)
  for (const line of lines) {
    const p = document.createElement('p')
    p.textContent = line
    box.append(p)
  }
  el.append(box)
  return el
}

export const errorScreen = (fileName: string, detail: string): HTMLElement =>
  screen('error-screen', TriangleAlert, `${fileName} açılamadı`, [detail])

export const unsupportedScreen = (fileName: string, detail = 'Bu dosya türü desteklenmiyor.'): HTMLElement =>
  screen('unsupported-screen', FileQuestion, fileName, [detail])
