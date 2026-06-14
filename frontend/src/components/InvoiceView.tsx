import { Invoice, Order } from '@/types';
import { Download, FileText } from 'lucide-react';

export default function InvoiceView({ invoice, order }: { invoice: Invoice; order: Order }) {
  const distanceCharge =
    Number(invoice.deliveryCharge) - Number(invoice.baseCharge) - Number(invoice.platformCharge) - Number(invoice.urgentCharge);

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between border-b border-slate-100 pb-4">
        <div className="flex items-center gap-2">
          <FileText className="text-sky-500" size={20} />
          <div>
            <p className="text-sm font-semibold text-slate-900">{invoice.invoiceNumber}</p>
            <p className="text-xs text-slate-500">Order #{order.orderNumber}</p>
          </div>
        </div>
        {invoice.pdfUrl && (
          <a
            href={invoice.pdfUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 rounded-full bg-sky-500 px-4 py-1.5 text-sm font-medium text-white hover:bg-sky-600"
          >
            <Download size={14} />
            Download
          </a>
        )}
      </div>

      {order.items && order.items.length > 0 && (
        <table className="mt-4 w-full text-sm">
          <thead>
            <tr className="text-left text-slate-500">
              <th className="pb-2">Medicine</th>
              <th className="pb-2 text-center">Qty</th>
              <th className="pb-2 text-right">Unit Price</th>
              <th className="pb-2 text-right">Amount</th>
            </tr>
          </thead>
          <tbody>
            {order.items.map((item) => (
              <tr key={item.id} className="border-t border-slate-100">
                <td className="py-2">{item.medicineName}</td>
                <td className="py-2 text-center">{item.quantity}</td>
                <td className="py-2 text-right">₹{Number(item.unitPrice ?? 0).toFixed(2)}</td>
                <td className="py-2 text-right">₹{(Number(item.unitPrice ?? 0) * item.quantity).toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <div className="mt-4 space-y-1.5 border-t border-slate-100 pt-4 text-sm">
        <div className="flex justify-between text-slate-600">
          <span>Medicine Cost</span>
          <span>₹{Number(invoice.medicineCost).toFixed(2)}</span>
        </div>
        <div className="flex justify-between text-slate-600">
          <span>Base Delivery Charge</span>
          <span>₹{Number(invoice.baseCharge).toFixed(2)}</span>
        </div>
        <div className="flex justify-between text-slate-600">
          <span>Distance Charge</span>
          <span>₹{distanceCharge > 0 ? distanceCharge.toFixed(2) : '0.00'}</span>
        </div>
        <div className="flex justify-between text-slate-600">
          <span>Platform Charge</span>
          <span>₹{Number(invoice.platformCharge).toFixed(2)}</span>
        </div>
        {Number(invoice.urgentCharge) > 0 && (
          <div className="flex justify-between text-slate-600">
            <span>Urgent Charge</span>
            <span>₹{Number(invoice.urgentCharge).toFixed(2)}</span>
          </div>
        )}
        <div className="flex justify-between text-slate-600">
          <span>Tax</span>
          <span>₹{Number(invoice.taxAmount).toFixed(2)}</span>
        </div>
        <div className="flex justify-between border-t border-slate-200 pt-2 text-base font-bold text-slate-900">
          <span>Total (Pay on Delivery)</span>
          <span>₹{Number(invoice.totalAmount).toFixed(2)}</span>
        </div>
      </div>
    </div>
  );
}