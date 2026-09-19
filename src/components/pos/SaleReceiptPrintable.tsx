import type { SaleReceipt } from '../../hooks/useSaleReceipt'

const currency = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' })
const dateTime = new Intl.DateTimeFormat('es-MX', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
})

const PAYMENT_LABEL: Record<string, string> = {
  cash: 'Efectivo',
  card: 'Tarjeta',
  transfer: 'Transferencia',
  fiado: 'Cargo a cuenta',
}

// Formato pensado para rollo térmico de 80mm (funciona igual en 58mm, solo
// se ve más apretado) — fuente monoespaciada, sin color, separadores de
// guiones en vez de bordes/sombras. Se monta oculto (`hidden print:block`,
// ver useReceiptPrinter e index.css) y solo se hace visible al imprimir.
export default function SaleReceiptPrintable({ receipt }: { receipt: SaleReceipt }) {
  return (
    <div className="mx-auto w-[80mm] p-2 font-mono text-[11px] leading-tight text-black">
      <div className="text-center">
        <p className="text-sm font-bold">{receipt.businessName}</p>
        <p>{receipt.branchName}</p>
        {receipt.branchAddress && <p>{receipt.branchAddress}</p>}
        {receipt.branchPhone && <p>Tel. {receipt.branchPhone}</p>}
      </div>

      <div className="my-1.5 border-t border-dashed border-black" />

      <div className="flex justify-between">
        <span>Folio {receipt.folio}</span>
        <span>{dateTime.format(new Date(receipt.createdAt))}</span>
      </div>

      <div className="my-1.5 border-t border-dashed border-black" />

      {receipt.items.map((item, index) => (
        <div key={index} className="mb-1">
          <p>{item.name}</p>
          <div className="flex justify-between">
            <span>
              {item.quantity} x {currency.format(item.unitPrice)}
            </span>
            <span>{currency.format(item.subtotal)}</span>
          </div>
        </div>
      ))}

      <div className="my-1.5 border-t border-dashed border-black" />

      <div className="flex justify-between">
        <span>Subtotal</span>
        <span>{currency.format(receipt.subtotal)}</span>
      </div>
      {receipt.discountTotal > 0 && (
        <div className="flex justify-between">
          <span>Descuento</span>
          <span>-{currency.format(receipt.discountTotal)}</span>
        </div>
      )}
      <div className="flex justify-between text-sm font-bold">
        <span>TOTAL</span>
        <span>{currency.format(receipt.total)}</span>
      </div>

      <div className="my-1.5 border-t border-dashed border-black" />

      {receipt.payments.map((payment, index) => (
        <div key={index} className="flex justify-between">
          <span>{PAYMENT_LABEL[payment.method] ?? payment.method}</span>
          <span>{currency.format(payment.amount)}</span>
        </div>
      ))}

      {receipt.customerCharge && (
        <>
          <div className="my-1.5 border-t border-dashed border-black" />
          <p className="text-center font-bold">Cargo a cuenta — {receipt.customerCharge.customerName}</p>
          <div className="flex justify-between">
            <span>Saldo actual</span>
            <span>{currency.format(receipt.customerCharge.balance)}</span>
          </div>
        </>
      )}

      <div className="my-1.5 border-t border-dashed border-black" />

      <p className="text-center">¡Gracias por su compra!</p>
    </div>
  )
}
