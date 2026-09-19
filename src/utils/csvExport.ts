// Exportación simple a CSV (se abre bien en Excel/Google Sheets) — sin
// librería, solo texto separado por comas con comillas escapadas donde
// haga falta. No hay generación de PDF real: el ticket ya usa el diálogo
// de impresión del navegador (que ya ofrece "Guardar como PDF"), y un
// reporte tabular no necesita más que esto para "llevarlo a Excel/el
// contador", que fue el pedido original.
function escapeCsvCell(value: string | number): string {
  const text = String(value)
  if (text.includes(',') || text.includes('"') || text.includes('\n')) {
    return `"${text.replace(/"/g, '""')}"`
  }
  return text
}

export function downloadCsv(filename: string, headers: string[], rows: (string | number)[][]) {
  const lines = [headers, ...rows].map((row) => row.map(escapeCsvCell).join(','))
  // BOM para que Excel detecte UTF-8 y no rompa los acentos/ñ.
  const csv = '﻿' + lines.join('\r\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}
