import { useEffect, useState } from 'react'
import SaleReceiptPrintable from '../components/pos/SaleReceiptPrintable'
import { useSaleReceipt } from './useSaleReceipt'

// Encapsula el flujo de "imprimir un ticket": guarda qué venta se está
// imprimiendo, pide sus datos (useSaleReceipt) y en cuanto llegan dispara
// el diálogo de impresión del navegador — con eso, cualquier impresora ya
// configurada en el sistema (incluida una térmica instalada como
// impresora normal, por USB o emparejada por Bluetooth a nivel de
// sistema) puede recibir el ticket sin depender de una integración por
// marca/modelo. `printable` se monta siempre oculto (ver la regla
// @media print en index.css) y solo se hace visible durante la
// impresión.
export function useReceiptPrinter() {
  const [saleId, setSaleId] = useState<string | null>(null)
  const { data: receipt, error } = useSaleReceipt(saleId)

  useEffect(() => {
    if (!receipt) return

    function cleanup() {
      document.body.classList.remove('printing-ticket')
      window.removeEventListener('afterprint', cleanup)
    }

    document.body.classList.add('printing-ticket')
    window.addEventListener('afterprint', cleanup)
    window.print()
    setSaleId(null)
  }, [receipt])

  return {
    print: setSaleId,
    printError: saleId && error ? error : null,
    printable: receipt ? (
      <div id="receipt-print-root" className="hidden print:block">
        <SaleReceiptPrintable receipt={receipt} />
      </div>
    ) : null,
  }
}
