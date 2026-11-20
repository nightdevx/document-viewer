/** Prints a node through #print-root (the app chrome is hidden by @media print). */
export async function printNode(node: Node): Promise<void> {
  const root = document.getElementById('print-root')!
  root.replaceChildren(node)
  try {
    if (window.api) await window.api.print()
    else window.print()
  } finally {
    root.replaceChildren()
  }
}
