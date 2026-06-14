'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/hooks/useLanguage';
import api, { getErrorMessage } from '@/lib/api';
import { Address } from '@/types';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Plus, Trash2, Pencil, AlertCircle, CheckCircle2, Loader2, MapPin, User as UserIcon } from 'lucide-react';
import { useGeolocation } from '@/hooks/useGeolocation';

export default function ProfilePage() {
  const { user, refetch, logout } = useAuth();
  const { t } = useLanguage();
  const {
    latitude,
    longitude,
    loading: locLoading,
    requestLocation,
  } = useGeolocation();

  const [addresses, setAddresses] = useState<Address[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [profileForm, setProfileForm] = useState({ fullName: "", mobile: "" });
  const [savingProfile, setSavingProfile] = useState(false);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Address | null>(null);
  const [addrForm, setAddrForm] = useState({
    label: "home",
    addressLine: "",
    city: "",
    state: "",
    pincode: "",
    isDefault: false,
  });
  const [savingAddr, setSavingAddr] = useState(false);

  async function fetchAddresses() {
    setLoading(true);
    try {
      const { data } = await api.get("/patient/addresses");
      setAddresses(data.addresses);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (user) {
      setProfileForm({ fullName: user.fullName, mobile: user.mobile });
    }
    fetchAddresses();
  }, [user]);

  async function handleProfileSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSavingProfile(true);
    setError(null);
    setSuccess(null);
    try {
      await api.patch("/patient/profile", profileForm);
      await refetch();
      setSuccess(t.save + " ✓");
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSavingProfile(false);
    }
  }

  function openCreateAddress() {
    setEditing(null);
    setAddrForm({
      label: "home",
      addressLine: "",
      city: "",
      state: "",
      pincode: "",
      isDefault: addresses.length === 0,
    });
    setDialogOpen(true);
  }

  function openEditAddress(addr: Address) {
    setEditing(addr);
    setAddrForm({
      label: addr.label,
      addressLine: addr.addressLine,
      city: addr.city,
      state: addr.state,
      pincode: addr.pincode,
      isDefault: addr.isDefault,
    });
    setDialogOpen(true);
  }

  async function handleAddressSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSavingAddr(true);
    setError(null);
    try {
      const payload: Record<string, any> = { ...addrForm };
      if (latitude && longitude) {
        payload.latitude = latitude;
        payload.longitude = longitude;
      }

      if (editing) {
        await api.patch(`/patient/addresses/${editing.id}`, payload);
      } else {
        await api.post("/patient/addresses", payload);
      }

      setDialogOpen(false);
      await fetchAddresses();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSavingAddr(false);
    }
  }

  async function handleDeleteAddress(id: string) {
    if (!confirm(t.delete + "?")) return;
    try {
      await api.delete(`/patient/addresses/${id}`);
      await fetchAddresses();
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h1 className="text-2xl font-bold text-slate-900">{t.profile}</h1>

      {error && (
        <div className="flex items-center gap-2 rounded-2xl bg-rose-50 p-4 text-sm text-rose-600">
          <AlertCircle size={16} />
          {error}
        </div>
      )}

      {success && (
        <div className="flex items-center gap-2 rounded-2xl bg-emerald-50 p-4 text-sm text-emerald-700">
          <CheckCircle2 size={16} />
          {success}
        </div>
      )}

      <form
        onSubmit={handleProfileSubmit}
        className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
      >
        <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
          <UserIcon size={16} className="text-sky-500" />
          {t.profile}
        </h2>

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">
            {t.fullName}
          </label>
          <input
            type="text"
            value={profileForm.fullName}
            onChange={(e) =>
              setProfileForm((p) => ({ ...p, fullName: e.target.value }))
            }
            className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-100"
            required
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">
            {t.mobile}
          </label>
          <input
            type="tel"
            value={profileForm.mobile}
            onChange={(e) =>
              setProfileForm((p) => ({
                ...p,
                mobile: e.target.value.replace(/\D/g, "").slice(0, 10),
              }))
            }
            className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-100"
            required
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">
            {t.email}
          </label>
          <input
            type="email"
            value={user?.email || ""}
            disabled
            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-400"
          />
        </div>

        <button
          type="submit"
          disabled={savingProfile}
          className="flex items-center gap-2 rounded-full bg-sky-500 px-5 py-2 text-sm font-semibold text-white hover:bg-sky-600 disabled:opacity-60"
        >
          {savingProfile && <Loader2 size={16} className="animate-spin" />}
          {t.save}
        </button>
      </form>

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
            <MapPin size={16} className="text-sky-500" />
            {t.address}
          </h2>
          <button
            onClick={openCreateAddress}
            className="flex items-center gap-1.5 text-sm font-medium text-sky-600 hover:underline"
          >
            <Plus size={16} />
            {t.addNewAddress}
          </button>
        </div>

        {loading ? (
          <p className="text-sm text-slate-400">{t.loading}</p>
        ) : addresses.length === 0 ? (
          <p className="text-sm text-slate-400">{t.noDataFound}</p>
        ) : (
          <div className="space-y-2">
            {addresses.map((addr) => (
              <div
                key={addr.id}
                className="flex items-start justify-between rounded-xl border border-slate-100 p-3"
              >
                <div>
                  <p className="text-sm font-medium text-slate-900 capitalize">
                    {addr.label}{" "}
                    {addr.isDefault && (
                      <span className="ml-1 rounded-full bg-sky-100 px-2 py-0.5 text-[10px] font-semibold text-sky-600">
                        Default
                      </span>
                    )}
                  </p>
                  <p className="text-sm text-slate-600">
                    {addr.addressLine}, {addr.city}, {addr.state} -{" "}
                    {addr.pincode}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => openEditAddress(addr)}
                    className="rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                  >
                    <Pencil size={16} />
                  </button>
                  <button
                    onClick={() => handleDeleteAddress(addr.id)}
                    className="rounded-full p-2 text-rose-400 hover:bg-rose-50 hover:text-rose-600"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <button
        onClick={logout}
        className="w-full rounded-full border border-rose-200 px-5 py-2.5 text-sm font-semibold text-rose-500 hover:bg-rose-50"
      >
        {t.logout}
      </button>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent onClose={() => setDialogOpen(false)}>
          <DialogHeader>
            <DialogTitle>{editing ? t.edit : t.addNewAddress}</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleAddressSubmit} className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                {t.addressLabel}
              </label>
              <select
                value={addrForm.label}
                onChange={(e) =>
                  setAddrForm((p) => ({ ...p, label: e.target.value }))
                }
                className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-100"
              >
                <option value="home">{t.home}</option>
                <option value="work">{t.work}</option>
                <option value="other">{t.other}</option>
              </select>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                {t.address}
              </label>
              <input
                type="text"
                value={addrForm.addressLine}
                onChange={(e) =>
                  setAddrForm((p) => ({ ...p, addressLine: e.target.value }))
                }
                className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-100"
                required
              />
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  {t.city}
                </label>
                <input
                  type="text"
                  value={addrForm.city}
                  onChange={(e) =>
                    setAddrForm((p) => ({ ...p, city: e.target.value }))
                  }
                  className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-100"
                  required
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  {t.state}
                </label>
                <input
                  type="text"
                  value={addrForm.state}
                  onChange={(e) =>
                    setAddrForm((p) => ({ ...p, state: e.target.value }))
                  }
                  className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-100"
                  required
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  {t.pincode}
                </label>
                <input
                  type="text"
                  value={addrForm.pincode}
                  onChange={(e) =>
                    setAddrForm((p) => ({
                      ...p,
                      pincode: e.target.value.replace(/\D/g, "").slice(0, 6),
                    }))
                  }
                  className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-100"
                  required
                />
              </div>
            </div>

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
                  : "Use my current location"}
            </button>

            <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
              <input
                type="checkbox"
                checked={addrForm.isDefault}
                onChange={(e) =>
                  setAddrForm((p) => ({ ...p, isDefault: e.target.checked }))
                }
                className="h-4 w-4 rounded border-slate-300 text-sky-500 focus:ring-sky-400"
              />
              {t.setAsDefault}
            </label>

            <button
              type="submit"
              disabled={savingAddr}
              className="flex w-full items-center justify-center gap-2 rounded-full bg-sky-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-sky-600 disabled:opacity-60"
            >
              {savingAddr && <Loader2 size={16} className="animate-spin" />}

              {t.save}
            </button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
