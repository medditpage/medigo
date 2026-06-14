'use client';
import { useEffect, useState } from 'react';

import { useLanguage } from '@/hooks/useLanguage';

import api, { getErrorMessage } from '@/lib/api';

import { MedicalStore } from '@/types';

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

import { Plus, Pencil, Trash2, AlertCircle, Store, Loader2, MapPin } from 'lucide-react';

import { useGeolocation } from '@/hooks/useGeolocation';
export default function AdminStoresPage() {

const { t, language } = useLanguage();

const { latitude, longitude, loading: locLoading, requestLocation } = useGeolocation();

const [stores, setStores] = useState<MedicalStore[]>([]);

const [loading, setLoading] = useState(true);

const [error, setError] = useState<string | null>(null);

const [dialogOpen, setDialogOpen] = useState(false);

const [editing, setEditing] = useState<MedicalStore | null>(null);

const [submitting, setSubmitting] = useState(false);
const [form, setForm] = useState({

name: '',

ownerName: '',

phone: '',

addressLine: '',

city: '',

state: '',

pincode: '',

licenseNumber: '',

opensAt: '08:00',

closesAt: '22:00',

isActive: true,

});
async function fetchStores() {

setLoading(true);

setError(null);

try {

const { data } = await api.get('/admin/stores');

setStores(data.stores);

} catch (err) {

setError(getErrorMessage(err));

} finally {

setLoading(false);

}

}
useEffect(() => {

fetchStores();

}, []);
function openCreate() {

setEditing(null);

setForm({

name: '',

ownerName: '',

phone: '',

addressLine: '',

city: '',

state: '',

pincode: '',

licenseNumber: '',

opensAt: '08:00',

closesAt: '22:00',

isActive: true,

});

setDialogOpen(true);

}
function openEdit(store: MedicalStore) {

setEditing(store);

setForm({

name: store.name,

ownerName: store.ownerName || '',

phone: store.phone,

addressLine: store.addressLine,

city: store.city,

state: store.state,

pincode: store.pincode,

licenseNumber: store.licenseNumber || '',

opensAt: store.opensAt || '08:00',

closesAt: store.closesAt || '22:00',

isActive: store.isActive,

});

setDialogOpen(true);

}
async function handleSubmit(e: React.FormEvent) {

e.preventDefault();

setSubmitting(true);

setError(null);
try {
  const payload: Record<string, any> = { ...form };

  if (editing) {
    await api.patch(`/admin/stores/${editing.id}`, payload);
  } else {
    if (!latitude || !longitude) {
      setError(language === 'hi' ? 'कृपया स्थान चुनें' : 'Please select a location');
      setSubmitting(false);
      return;
    }
    payload.latitude = latitude;
    payload.longitude = longitude;
    await api.post('/admin/stores', payload);
  }

  setDialogOpen(false);
  await fetchStores();
} catch (err) {
  setError(getErrorMessage(err));
} finally {
  setSubmitting(false);
}
}
async function handleDelete(id: string) {

if (!confirm(t.delete + '?')) return;

try {

await api.delete(`/admin/stores/${id}`);

await fetchStores();

} catch (err) {

setError(getErrorMessage(err));

}

}
return (

<div className="space-y-6">

<div className="flex items-center justify-between">

<h1 className="text-2xl font-bold text-slate-900">{t.manageStores}</h1>

<button
       onClick={openCreate}
       className="flex items-center gap-1.5 rounded-full bg-sky-500 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-600"
     >

<Plus size={16} />

{t.addStore}

</button>

</div>
  {error && (
    <div className="flex items-center gap-2 rounded-2xl bg-rose-50 p-4 text-sm text-rose-600">
      <AlertCircle size={16} />
      {error}
    </div>
  )}

  {loading ? (
    <p className="text-sm text-slate-400">{t.loading}</p>
  ) : stores.length === 0 ? (
    <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-8 text-center text-sm text-slate-400">
      <Store className="mx-auto mb-2 text-slate-300" size={32} />
      {t.noDataFound}
    </div>
  ) : (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      {stores.map((store) => (
        <div key={store.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-semibold text-slate-900">{store.name}</p>
              <p className="text-xs text-slate-500">{store.addressLine}, {store.city}, {store.state} - {store.pincode}</p>
              <p className="mt-1 text-xs text-slate-500">{store.phone}</p>
              {store.opensAt && store.closesAt && (
                <p className="text-xs text-slate-400">{store.opensAt} - {store.closesAt}</p>
              )}
            </div>
            <span
              className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                store.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'
              }`}
            >
              {store.isActive ? 'Active' : 'Inactive'}
            </span>
          </div>
          <div className="mt-3 flex gap-2 border-t border-slate-100 pt-3">
            <button onClick={() => openEdit(store)} className="flex items-center gap-1.5 rounded-full border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50">
              <Pencil size={14} />
              {t.edit}
            </button>
            <button onClick={() => handleDelete(store.id)} className="flex items-center gap-1.5 rounded-full bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-100">
              <Trash2 size={14} />
              {t.delete}
            </button>
          </div>
        </div>
      ))}
    </div>
  )}

  <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
    <DialogContent onClose={() => setDialogOpen(false)}>
      <DialogHeader>
        <DialogTitle>{editing ? t.edit : t.addStore}</DialogTitle>
      </DialogHeader>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">{t.storeName}</label>
          <input
            type="text"
            value={form.name}
            onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
            className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-100"
            required
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">{language === 'hi' ? 'मालिक का नाम' : 'Owner Name'}</label>
            <input
              type="text"
              value={form.ownerName}
              onChange={(e) => setForm((p) => ({ ...p, ownerName: e.target.value }))}
              className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-100"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">{t.phone}</label>
            <input
              type="tel"
              value={form.phone}
              onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value.replace(/\D/g, '').slice(0, 10) }))}
              className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-100"
              required
            />
          </div>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">{t.address}</label>
          <input
            type="text"
            value={form.addressLine}
            onChange={(e) => setForm((p) => ({ ...p, addressLine: e.target.value }))}
            className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-100"
            required
          />
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">{t.city}</label>
            <input
              type="text"
              value={form.city}
              onChange={(e) => setForm((p) => ({ ...p, city: e.target.value }))}
              className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-100"
              required
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">{t.state}</label>
            <input
              type="text"
              value={form.state}
              onChange={(e) => setForm((p) => ({ ...p, state: e.target.value }))}
              className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-100"
              required
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">{t.pincode}</label>
            <input
              type="text"
              value={form.pincode}
              onChange={(e) => setForm((p) => ({ ...p, pincode: e.target.value.replace(/\D/g, '').slice(0, 6) }))}
              className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-100"
              required
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">{t.openingTime}</label>
            <input
              type="time"
              value={form.opensAt}
              onChange={(e) => setForm((p) => ({ ...p, opensAt: e.target.value }))}
              className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-100"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">{t.closingTime}</label>
            <input
              type="time"
              value={form.closesAt}
              onChange={(e) => setForm((p) => ({ ...p, closesAt: e.target.value }))}
              className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-100"
            />
          </div>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">
            {language === 'hi' ? 'लाइसेंस नंबर' : 'License Number'}
          </label>
          <input
            type="text"
            value={form.licenseNumber}
            onChange={(e) => setForm((p) => ({ ...p, licenseNumber: e.target.value }))}
            className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-100"
          />
        </div>

        {!editing && (
          <div>
            <button
              type="button"
              onClick={requestLocation}
              className="flex items-center gap-2 rounded-full border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
            >
              <MapPin size={16} />
              {locLoading
                ? t.loading
                : latitude && longitude
                ? `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`
                : language === 'hi' ? 'स्थान चुनें' : 'Set location'}
            </button>
          </div>
        )}

        {editing && (
          <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
            <input
              type="checkbox"
              checked={form.isActive}
              onChange={(e) => setForm((p) => ({ ...p, isActive: e.target.checked }))}
              className="h-4 w-4 rounded border-slate-300 text-sky-500 focus:ring-sky-400"
            />
            Active
          </label>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="flex w-full items-center justify-center gap-2 rounded-full bg-sky-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-sky-600 disabled:opacity-60"
        >
          {submitting && <Loader2 size={16} className="animate-spin" />}
          {t.save}
        </button>
      </form>
    </DialogContent>
  </Dialog>
</div>
);

}