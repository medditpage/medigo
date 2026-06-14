// frontend/src/app/(agent)/agent/orders/[id]/page.tsx
'use client';
import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { v4 as uuidv4 } from 'uuid';
import { supabase } from "@/lib/supabase";
import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/hooks/useLanguage';
import api, { getErrorMessage } from '@/lib/api';
import { Order } from '@/types';
import StatusBadge from '@/components/StatusBadge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  AlertCircle,
  ArrowLeft,
  MapPin,
  Phone,
  Package,
  Upload,
  Loader2,
  ImageIcon,
  Navigation,
} from 'lucide-react';

const TRANSITIONS: Record<string, { next: string; label: (lang: 'en' | 'hi') => string } | null> = {
  accepted: { next: 'purchasing', label: (l) => (l === 'hi' ? 'खरीदारी शुरू करें' : 'Start Purchasing') },
  purchasing: null,
  bill_uploaded: { next: 'out_for_delivery', label: (l) => (l === 'hi' ? 'डिलीवरी के लिए निकलें' : 'Out for Delivery') },
  out_for_delivery: { next: 'delivered', label: (l) => (l === 'hi' ? 'डिलीवर के रूप में चिह्नित करें' : 'Mark Delivered') },
};

export default function AgentOrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const { t, language } = useLanguage();

  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updating, setUpdating] = useState(false);

  const [billDialogOpen, setBillDialogOpen] = useState(false);
  const [billFile, setBillFile] = useState<File | null>(null);
  const [medicineCost, setMedicineCost] = useState("");
  const [uploadingBill, setUploadingBill] = useState(false);

  const fetchOrder = useCallback(async () => {
    try {
      const { data } = await api.get(`/orders/${id}`);
      setOrder(data.order);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchOrder();
  }, [fetchOrder]);

  async function handleStatusUpdate(status: string) {
    if (!order) return;
    setUpdating(true);
    setError(null);
    try {
      await api.patch(`/agent/orders/${order.id}/status`, { status });
      await fetchOrder();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setUpdating(false);
    }
  }

  async function handleBillSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!order || !billFile || !medicineCost) {
      setError(t.requiredField);
      return;
    }

    const cost = parseFloat(medicineCost);
    if (isNaN(cost) || cost < 0) {
      setError("Enter a valid medicine cost");
      return;
    }

    setUploadingBill(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append("file", billFile);

      const { data: uploadData } = await api.post(
        `/agent/orders/${order.id}/upload-bill`,
        formData,
        { headers: { "Content-Type": "multipart/form-data" } },
      );

      await api.post(`/agent/orders/${order.id}/bill`, {
        billImageUrl: uploadData.url,
        medicineCost: cost,
      });

      setBillDialogOpen(false);
      setBillFile(null);
      setMedicineCost("");
      await fetchOrder();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setUploadingBill(false);
    }
  }

  if (loading) return <p className="text-sm text-slate-400">{t.loading}</p>;

  if (error && !order) {
    return (
      <div className="flex items-center gap-2 rounded-2xl bg-rose-50 p-4 text-sm text-rose-600">
        <AlertCircle size={16} />
        {error}
      </div>
    );
  }

  if (!order) return null;

  const transition = TRANSITIONS[order.status];
  const showBillUpload = order.status === "purchasing";
  const mapUrl = `https://www.google.com/maps/dir/?api=1&destination=${order.deliveryLatitude},${order.deliveryLongitude}`;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-center gap-3">
        <button
          onClick={() => router.back()}
          className="rounded-full p-2 hover:bg-slate-100"
        >
          <ArrowLeft size={18} />
        </button>
        <div>
          <h1 className="text-xl font-bold text-slate-900">
            {order.orderNumber}
          </h1>
          <p className="text-xs text-slate-500">
            {new Date(order.createdAt).toLocaleString("en-IN", {
              dateStyle: "medium",
              timeStyle: "short",
            })}
          </p>
        </div>
        <div className="ml-auto">
          <StatusBadge status={order.status} language={language} />
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-2xl bg-rose-50 p-4 text-sm text-rose-600">
          <AlertCircle size={16} />
          {error}
        </div>
      )}

      {order.isUrgent && (
        <div className="inline-flex items-center rounded-full bg-rose-50 px-3 py-1 text-xs font-semibold text-rose-600">
          URGENT ORDER
        </div>
      )}

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-900">
          <Phone size={16} className="text-sky-500" />
          {language === "hi" ? "मरीज की जानकारी" : "Patient Details"}
        </h2>
        <p className="text-sm font-medium text-slate-700">
          {order.patient?.fullName}
        </p>
        {order.patient?.mobile && (
          <a
            href={`tel:${order.patient.mobile}`}
            className="mt-1 flex items-center gap-1.5 text-sm font-medium text-sky-600 hover:underline"
          >
            <Phone size={14} />
            {order.patient.mobile}
          </a>
        )}
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-900">
          <MapPin size={16} className="text-sky-500" />
          {t.deliveryAddress}
        </h2>
        {order.address && (
          <p className="text-sm text-slate-600">
            {order.address.addressLine}, {order.address.city},{" "}
            {order.address.state} - {order.address.pincode}
          </p>
        )}
        {order.distanceKm && (
          <p className="mt-1 text-xs text-slate-400">
            {t.distance}: {order.distanceKm} km
          </p>
        )}
        {order.store && (
          <p className="mt-2 text-xs text-slate-500">
            {language === "hi" ? "दुकान" : "Store"}: {order.store.name} -{" "}
            {order.store.phone}
          </p>
        )}

        <a
          href={mapUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-3 flex items-center gap-1.5 text-sm font-medium text-sky-600 hover:underline"
        >
          <Navigation size={14} />
          {language === "hi" ? "नेविगेशन खोलें" : "Open Navigation"}
        </a>
      </div>

      {order.orderMethod === "prescription" &&
        order.prescriptionImageUrls.length > 0 && (
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-900">
              <ImageIcon size={16} className="text-sky-500" />
              {t.uploadPrescription}
            </h2>
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
              {order.prescriptionImageUrls.map((url, idx) => (
                <a
                  key={idx}
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="aspect-square overflow-hidden rounded-lg border border-slate-200"
                >
                  <img
                    src={url}
                    alt={`Prescription ${idx + 1}`}
                    className="h-full w-full object-cover"
                  />
                </a>
              ))}
            </div>
          </div>
        )}

      {order.orderMethod === "manual" &&
        order.items &&
        order.items.length > 0 && (
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-900">
              <Package size={16} className="text-sky-500" />
              {language === "hi" ? "दवा सूची" : "Medicine List"}
            </h2>
            <ul className="space-y-1.5 text-sm text-slate-600">
              {order.items.map((item) => (
                <li key={item.id} className="flex justify-between">
                  <span>{item.medicineName}</span>
                  <span>x{item.quantity}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

      {order.notes && (
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-2 text-sm font-semibold text-slate-900">
            {t.notes}
          </h2>
          <p className="text-sm text-slate-600">{order.notes}</p>
        </div>
      )}

      {order.billImageUrl && (
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-3 text-sm font-semibold text-slate-900">
            {language === "hi" ? "खरीद बिल" : "Purchase Bill"}
          </h2>
          <a
            href={order.billImageUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="block aspect-video max-w-xs overflow-hidden rounded-lg border border-slate-200"
          >
            <img
              src={order.billImageUrl}
              alt="Bill"
              className="h-full w-full object-cover"
            />
          </a>
          {order.totalAmount && (
            <p className="mt-2 text-sm font-semibold text-slate-900">
              {t.totalAmount}: ₹{Number(order.totalAmount).toFixed(2)} ({t.cod})
            </p>
          )}
        </div>
      )}

      <div className="flex flex-wrap gap-3">
        {showBillUpload && (
          <button
            onClick={() => setBillDialogOpen(true)}
            className="flex items-center gap-2 rounded-full bg-sky-500 px-5 py-2.5 text-sm font-semibold text-white hover:bg-sky-600"
          >
            <Upload size={16} />
            {t.uploadBill}
          </button>
        )}

        {transition && (
          <button
            onClick={() => handleStatusUpdate(transition.next)}
            disabled={updating}
            className="flex items-center gap-2 rounded-full bg-emerald-500 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-600 disabled:opacity-60"
          >
            {updating && <Loader2 size={16} className="animate-spin" />}
            {transition.label(language)}
          </button>
        )}
      </div>

      <Dialog open={billDialogOpen} onOpenChange={setBillDialogOpen}>
        <DialogContent onClose={() => setBillDialogOpen(false)}>
          <DialogHeader>
            <DialogTitle>{t.uploadBill}</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleBillSubmit} className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                {language === "hi" ? "बिल की फोटो" : "Bill Photo"}
              </label>
              <label className="flex cursor-pointer flex-col items-center gap-2 rounded-xl border-2 border-dashed border-slate-300 p-6 text-center hover:bg-slate-50">
                <Upload className="text-slate-400" size={28} />
                <span className="text-sm text-slate-500">
                  {billFile ? billFile.name : "Click to upload bill image"}
                </span>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => setBillFile(e.target.files?.[0] || null)}
                />
              </label>
              {billFile && (
                <div className="mt-2 aspect-video w-full overflow-hidden rounded-lg border border-slate-200">
                  <img
                    src={URL.createObjectURL(billFile)}
                    alt="Bill preview"
                    className="h-full w-full object-cover"
                  />
                </div>
              )}
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                {t.medicineCost} (₹)
              </label>
              <input
                type="number"
                min={0}
                step="0.01"
                value={medicineCost}
                onChange={(e) => setMedicineCost(e.target.value)}
                className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-100"
                required
              />
            </div>

            <button
              type="submit"
              disabled={uploadingBill}
              className="flex w-full items-center justify-center gap-2 rounded-full bg-sky-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-sky-600 disabled:opacity-60"
            >
              {uploadingBill && <Loader2 size={16} className="animate-spin" />}
              {t.submit}
            </button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}