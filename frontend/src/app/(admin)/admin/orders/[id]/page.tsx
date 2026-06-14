'use client';
import { useEffect, useState } from 'react';

import { useParams, useRouter } from 'next/navigation';

import { useLanguage } from '@/hooks/useLanguage';

import api, { getErrorMessage } from '@/lib/api';

import { Order } from '@/types';

import StatusBadge from '@/components/StatusBadge';

import InvoiceView from '@/components/InvoiceView';

import { AlertCircle, ArrowLeft, MapPin, Phone, Image as ImageIcon, Package, History } from 'lucide-react';
export default function AdminOrderDetailPage() {

const { id } = useParams<{ id: string }>();

const router = useRouter();

const { t, language } = useLanguage();

const [order, setOrder] = useState<Order | null>(null);

const [loading, setLoading] = useState(true);

const [error, setError] = useState<string | null>(null);
useEffect(() => {

const fetchOrder = async () => {

try {

const { data } = await api.get(`/orders/${id}`);

setOrder(data.order);

} catch (err) {

setError(getErrorMessage(err));

} finally {

setLoading(false);

}

};

fetchOrder();

}, [id]);
if (loading) return <p className="text-sm text-slate-400">{t.loading}</p>;
if (error || !order) {

return (

<div className="flex items-center gap-2 rounded-2xl bg-rose-50 p-4 text-sm text-rose-600">

<AlertCircle size={16} />

{error || t.noDataFound}

</div>

);

}
return (

<div className="mx-auto max-w-3xl space-y-6">

<div className="flex items-center gap-3">

<button onClick={() => router.back()} className="rounded-full p-2 hover:bg-slate-100">

<ArrowLeft size={18} />

</button>

<div>

<h1 className="text-xl font-bold text-slate-900">{order.orderNumber}</h1>

<p className="text-xs text-slate-500">

{new Date(order.createdAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}

</p>

</div>

<div className="ml-auto">

<StatusBadge status={order.status} language={language} />

</div>

</div>
  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-900">
        <Phone size={16} className="text-sky-500" />
        {language === 'hi' ? 'मरीज' : 'Patient'}
      </h2>
      <p className="text-sm font-medium text-slate-700">{(order as any).patient?.fullName}</p>
      <p className="text-sm text-slate-500">{(order as any).patient?.mobile}</p>
    </div>

    {order.agent && (
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-900">
          <Package size={16} className="text-sky-500" />
          {language === 'hi' ? 'डिलीवरी एजेंट' : 'Delivery Agent'}
        </h2>
        <p className="text-sm font-medium text-slate-700">{order.agent.user?.fullName}</p>
        <p className="text-sm text-slate-500">{order.agent.user?.mobile} - {order.agent.vehicleNumber}</p>
      </div>
    )}
  </div>

  <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
    <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-900">
      <MapPin size={16} className="text-sky-500" />
      {t.deliveryAddress}
    </h2>
    {order.address && (
      <p className="text-sm text-slate-600">
        {order.address.addressLine}, {order.address.city}, {order.address.state} - {order.address.pincode}
      </p>
    )}
    {order.distanceKm && <p className="mt-1 text-xs text-slate-400">{t.distance}: {order.distanceKm} km</p>}
    {order.store && <p className="mt-2 text-xs text-slate-500">Store: {order.store.name}</p>}
  </div>

  {order.orderMethod === 'prescription' && order.prescriptionImageUrls.length > 0 && (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-900">
        <ImageIcon size={16} className="text-sky-500" />
        {t.uploadPrescription}
      </h2>
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
        {order.prescriptionImageUrls.map((url, idx) => (
          <a key={idx} href={url} target="_blank" rel="noopener noreferrer" className="aspect-square overflow-hidden rounded-lg border border-slate-200">
            <img src={url} alt={`Prescription ${idx + 1}`} className="h-full w-full object-cover" />
          </a>
        ))}
      </div>
    </div>
  )}

  {order.items && order.items.length > 0 && !order.invoice && (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="mb-3 text-sm font-semibold text-slate-900">{language === 'hi' ? 'दवाएं' : 'Medicines'}</h2>
      <ul className="space-y-1.5 text-sm text-slate-600">
        {order.items.map((item) => (
          <li key={item.id} className="flex justify-between">
            <span>{item.medicineName} x{item.quantity}</span>
            {item.unitPrice && <span>₹{(Number(item.unitPrice) * item.quantity).toFixed(2)}</span>}
          </li>
        ))}
      </ul>
    </div>
  )}

  {order.billImageUrl && (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="mb-3 text-sm font-semibold text-slate-900">{language === 'hi' ? 'खरीद बिल' : 'Purchase Bill'}</h2>
      <a href={order.billImageUrl} target="_blank" rel="noopener noreferrer" className="block aspect-video max-w-xs overflow-hidden rounded-lg border border-slate-200">
        <img src={order.billImageUrl} alt="Bill" className="h-full w-full object-cover" />
      </a>
    </div>
  )}

  {order.invoice && <InvoiceView invoice={order.invoice} order={order} />}

  {order.statusHistory && order.statusHistory.length > 0 && (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-900">
        <History size={16} className="text-sky-500" />
        {language === 'hi' ? 'स्थिति इतिहास' : 'Status History'}
      </h2>
      <div className="space-y-3">
        {order.statusHistory.map((h) => (
          <div key={h.id} className="flex items-start gap-3 text-sm">
            <div className="mt-1 h-2 w-2 flex-shrink-0 rounded-full bg-sky-500" />
            <div>
              <p className="font-medium text-slate-900 capitalize">{h.status.replace(/_/g, ' ')}</p>
              {h.note && <p className="text-xs text-slate-500">{h.note}</p>}
              <p className="text-xs text-slate-400">{new Date(h.createdAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )}
</div>
);

}