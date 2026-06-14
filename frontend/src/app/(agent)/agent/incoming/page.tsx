'use client';
import { useEffect, useState, useCallback } from 'react';

import { useRouter } from 'next/navigation';

import { useLanguage } from '@/hooks/useLanguage';

import api, { getErrorMessage } from '@/lib/api';

import { AssignmentIncoming } from '@/types';

import { AlertCircle, MapPin, Clock, Package, Loader2, CheckCircle2 } from 'lucide-react';
function useCountdown(expiresAt: string) {

const [remaining, setRemaining] = useState(0);
useEffect(() => {

function update() {

const diff = Math.max(0, Math.floor((new Date(expiresAt).getTime() - Date.now()) / 1000));

setRemaining(diff);

}

update();

const interval = setInterval(update, 1000);

return () => clearInterval(interval);

}, [expiresAt]);
return remaining;

}
function IncomingOrderCard({

item,

onAccept,

accepting,

language,

}: {

item: AssignmentIncoming;

onAccept: (orderId: string) => void;

accepting: string | null;

language: 'en' | 'hi';

}) {

const remaining = useCountdown(item.expiresAt);

const minutes = Math.floor(remaining / 60);

const seconds = remaining % 60;
return (

<div className="rounded-2xl border border-sky-200 bg-white p-4 shadow-sm">

<div className="flex items-center justify-between">

<div className="flex items-center gap-3">

<div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-50 text-sky-500">

<Package size={20} />

</div>

<div>

<p className="text-sm font-semibold text-slate-900">{item.order.orderNumber}</p>

<p className="flex items-center gap-1 text-xs text-slate-500">

<MapPin size={12} />

{item.distanceKm} km · {item.order.address?.city}

</p>

</div>

</div>

<div className="flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700">

<Clock size={12} />

{minutes}:{seconds.toString().padStart(2, '0')}

</div>

</div>
  {item.order.orderMethod === 'manual' && item.order.items && item.order.items.length > 0 && (
    <div className="mt-3 space-y-1 border-t border-slate-100 pt-3 text-sm text-slate-600">
      {item.order.items.slice(0, 3).map((med) => (
        <p key={med.id}>
          {med.medicineName} x{med.quantity}
        </p>
      ))}
      {item.order.items.length > 3 && <p className="text-xs text-slate-400">+{item.order.items.length - 3} more</p>}
    </div>
  )}

  {item.order.orderMethod === 'prescription' && (
    <div className="mt-3 border-t border-slate-100 pt-3 text-sm text-slate-600">
      {language === 'hi' ? 'पर्ची द्वारा ऑर्डर' : 'Prescription-based order'}
      {item.order.prescriptionImageUrls.length > 0 && (
        <span className="ml-1 text-xs text-slate-400">({item.order.prescriptionImageUrls.length} images)</span>
      )}
    </div>
  )}

  {item.order.isUrgent && (
    <div className="mt-2 inline-flex items-center rounded-full bg-rose-50 px-2.5 py-0.5 text-xs font-semibold text-rose-600">
      URGENT
    </div>
  )}

  <button
    onClick={() => onAccept(item.order.id)}
    disabled={accepting === item.order.id || remaining === 0}
    className="mt-3 flex w-full items-center justify-center gap-2 rounded-full bg-sky-500 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-600 disabled:opacity-60"
  >
    {accepting === item.order.id && <Loader2 size={16} className="animate-spin" />}
    {t_accept(language)}
  </button>
</div>
);

}
function t_accept(language: 'en' | 'hi') {

return language === 'hi' ? 'स्वीकार करें' : 'Accept';

}
export default function IncomingOrdersPage() {

const { t, language } = useLanguage();

const router = useRouter();

const [incoming, setIncoming] = useState<AssignmentIncoming[]>([]);

const [loading, setLoading] = useState(true);

const [error, setError] = useState<string | null>(null);

const [accepting, setAccepting] = useState<string | null>(null);

const [acceptError, setAcceptError] = useState<string | null>(null);
const fetchIncoming = useCallback(async () => {

try {

const { data } = await api.get('/agent/orders/incoming');

setIncoming(data.incoming);

} catch (err) {

setError(getErrorMessage(err));

} finally {

setLoading(false);

}

}, []);
useEffect(() => {

fetchIncoming();

const interval = setInterval(fetchIncoming, 5000);

return () => clearInterval(interval);

}, [fetchIncoming]);
async function handleAccept(orderId: string) {

setAccepting(orderId);

setAcceptError(null);

try {

await api.post(`/agent/orders/${orderId}/accept`);

router.push(`/agent/orders/${orderId}`);

} catch (err) {

setAcceptError(getErrorMessage(err));

await fetchIncoming();

} finally {

setAccepting(null);

}

}
return (

<div className="space-y-6">

<h1 className="text-2xl font-bold text-slate-900">{t.incomingOrders}</h1>
  {(error || acceptError) && (
    <div className="flex items-center gap-2 rounded-2xl bg-rose-50 p-4 text-sm text-rose-600">
      <AlertCircle size={16} />
      {error || acceptError}
    </div>
  )}

  {loading ? (
    <p className="text-sm text-slate-400">{t.loading}</p>
  ) : incoming.length === 0 ? (
    <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-8 text-center text-sm text-slate-400">
      <CheckCircle2 className="mx-auto mb-2 text-slate-300" size={32} />
      {language === 'hi' ? 'अभी कोई नया ऑर्डर नहीं है। ऑनलाइन रहें।' : 'No new orders right now. Stay online to receive requests.'}
    </div>
  ) : (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      {incoming.map((item) => (
        <IncomingOrderCard key={item.assignmentId} item={item} onAccept={handleAccept} accepting={accepting} language={language} />
      ))}
    </div>
  )}
</div>
);

}