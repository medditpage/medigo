"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { useLanguage } from "@/hooks/useLanguage";
import { supabase } from "@/lib/supabase";
import api, { getErrorMessage } from "@/lib/api";
import { Order } from "@/types";
import StatusBadge from "@/components/StatusBadge";
import InvoiceView from "@/components/InvoiceView";
import {
  AlertCircle,
  MapPin,
  Phone,
  Star,
  Package,
  ArrowLeft,
  Image as ImageIcon,
  CheckCircle2,
  XCircle,
  Loader2,
  RefreshCw,
} from "lucide-react";
import Link from "next/link";

const STATUS_STEPS: Order["status"][] = [
  "pending",
  "assigned",
  "accepted",
  "purchasing",
  "bill_uploaded",
  "out_for_delivery",
  "delivered",
];

export default function OrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { t, language } = useLanguage();

  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);
  const [ratingValue, setRatingValue] = useState(5);
  const [reviewText, setReviewText] = useState("");
  const [submittingRating, setSubmittingRating] = useState(false);

  const fetchOrder = useCallback(async () => {
    try {
      const { data } = await api.get(`/orders/${id}`);
      setOrder(data.order);
      setError(null);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchOrder();
  }, [fetchOrder]);

  // Real-time updates via Supabase Realtime
  useEffect(() => {
    if (!id) return;

    const channel = supabase
      .channel(`order-detail-${id}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "orders",
          filter: `id=eq.${id}`,
        },
        () => {
          fetchOrder();
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [id, fetchOrder]);

  // Polling fallback every 15s for active orders
  useEffect(() => {
    if (!order) return;
    const activeStatuses = [
      "pending",
      "assigned",
      "accepted",
      "purchasing",
      "bill_uploaded",
      "out_for_delivery",
    ];
    if (!activeStatuses.includes(order.status)) return;

    const interval = setInterval(fetchOrder, 15000);
    return () => clearInterval(interval);
  }, [order?.status, fetchOrder]);

  async function handleCancel() {
    if (!order) return;
    setCancelling(true);
    setCancelError(null);

    try {
      await api.post(`/orders/${order.id}/cancel`, { reason: "" });
      await fetchOrder();
    } catch (err) {
      // Show the cancel error separately so it's visible
      setCancelError(getErrorMessage(err));
    } finally {
      setCancelling(false);
    }
  }

  async function handleRate(e: React.FormEvent) {
    e.preventDefault();
    if (!order) return;
    setSubmittingRating(true);
    setError(null);
    try {
      await api.post(`/orders/${order.id}/rate`, {
        rating: ratingValue,
        review: reviewText || undefined,
      });
      await fetchOrder();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSubmittingRating(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-slate-400">
        <Loader2 size={16} className="animate-spin" />
        {t.loading}
      </div>
    );
  }

  if (error && !order) {
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2 rounded-2xl bg-rose-50 p-4 text-sm text-rose-600">
          <AlertCircle size={16} />
          {error}
        </div>
        <button
          onClick={fetchOrder}
          className="flex items-center gap-1.5 text-sm font-medium text-sky-600 hover:underline"
        >
          <RefreshCw size={14} />
          Retry
        </button>
      </div>
    );
  }

  if (!order) return null;

  const currentStepIndex = STATUS_STEPS.indexOf(order.status);
  const isCancellable = ["pending", "assigned", "accepted"].includes(
    order.status,
  );

  return (
    <div className="mx-auto max-w-3xl space-y-6">
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
        <div className="ml-auto flex items-center gap-2">
          <button
            onClick={fetchOrder}
            className="rounded-full p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
            title="Refresh"
          >
            <RefreshCw size={14} />
          </button>
          <StatusBadge status={order.status} language={language} />
        </div>
      </div>

      {/* General error */}
      {error && (
        <div className="flex items-center gap-2 rounded-2xl bg-rose-50 p-4 text-sm text-rose-600">
          <AlertCircle size={16} />
          {error}
        </div>
      )}

      {/* Cancel-specific error — shown prominently */}
      {cancelError && (
        <div className="flex items-start gap-2 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
          <AlertCircle size={16} className="mt-0.5 flex-shrink-0" />
          <div>
            <p className="font-semibold">Could not cancel order</p>
            <p className="mt-0.5">{cancelError}</p>
          </div>
        </div>
      )}

      {/* Status progress bar */}
      {order.status !== "cancelled" && order.status !== "expired" && (
        <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex min-w-max items-center justify-between gap-1">
            {STATUS_STEPS.map((step, idx) => (
              <div
                key={step}
                className="flex flex-1 flex-col items-center text-center"
              >
                <div
                  className={`flex h-7 w-7 items-center justify-center rounded-full text-[10px] font-bold ${
                    idx < currentStepIndex
                      ? "bg-emerald-500 text-white"
                      : idx === currentStepIndex
                        ? "bg-sky-500 text-white ring-4 ring-sky-100"
                        : "bg-slate-200 text-slate-400"
                  }`}
                >
                  {idx < currentStepIndex ? "✓" : idx + 1}
                </div>
                <span
                  className={`mt-1 text-[9px] leading-tight ${
                    idx <= currentStepIndex
                      ? "font-semibold text-sky-600"
                      : "text-slate-400"
                  }`}
                >
                  {(t as any)[step]}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {order.status === "pending" && (
        <div className="flex items-center gap-2 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-700">
          <Loader2 size={16} className="animate-spin" />
          {language === "hi"
            ? "एजेंट खोजा जा रहा है... कृपया प्रतीक्षा करें।"
            : "Finding a delivery agent nearby... Please wait."}
        </div>
      )}

      {order.status === "cancelled" && (
        <div className="flex items-center gap-2 rounded-2xl bg-rose-50 p-4 text-sm text-rose-600">
          <XCircle size={16} />
          {language === "hi"
            ? "यह ऑर्डर रद्द कर दिया गया है।"
            : "This order has been cancelled."}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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
          {order.familyMember && (
            <p className="mt-2 text-xs text-slate-500">
              {language === "hi" ? "के लिए" : "For"}:{" "}
              {order.familyMember.fullName} (
              {(t as any)[order.familyMember.relation]})
            </p>
          )}
        </div>

        {order.agent && (
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-900">
              <Package size={16} className="text-sky-500" />
              {language === "hi" ? "डिलीवरी एजेंट" : "Delivery Agent"}
            </h2>
            <p className="text-sm font-medium text-slate-700">
              {order.agent.user?.fullName}
            </p>
            <p className="text-xs text-slate-500">
              {order.agent.vehicleType?.toUpperCase()} -{" "}
              {order.agent.vehicleNumber}
            </p>
            {order.agent.user?.mobile && (
              <a
                href={`tel:${order.agent.user.mobile}`}
                className="mt-2 flex items-center gap-1.5 text-sm font-medium text-sky-600 hover:underline"
              >
                <Phone size={14} />
                {t.callAgent}
              </a>
            )}
          </div>
        )}
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

      {order.items &&
        order.items.length > 0 &&
        order.orderMethod === "manual" &&
        !order.invoice && (
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="mb-3 text-sm font-semibold text-slate-900">
              {t.medicineName}
            </h2>
            <ul className="space-y-2 text-sm text-slate-600">
              {order.items.map((item) => (
                <li key={item.id} className="flex justify-between">
                  <span>
                    {item.medicineName} x{item.quantity}
                  </span>
                  {item.unitPrice && (
                    <span>
                      ₹{(Number(item.unitPrice) * item.quantity).toFixed(2)}
                    </span>
                  )}
                </li>
              ))}
            </ul>
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
        </div>
      )}

      {order.invoice && <InvoiceView invoice={order.invoice} order={order} />}

      {order.status === "delivered" && !order.rating && (
        <form
          onSubmit={handleRate}
          className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
        >
          <h2 className="mb-3 text-sm font-semibold text-slate-900">
            {t.rateOrder}
          </h2>
          <div className="mb-3 flex gap-1">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                onClick={() => setRatingValue(star)}
              >
                <Star
                  size={28}
                  className={
                    star <= ratingValue
                      ? "fill-amber-400 text-amber-400"
                      : "text-slate-300"
                  }
                />
              </button>
            ))}
          </div>
          <textarea
            value={reviewText}
            onChange={(e) => setReviewText(e.target.value)}
            placeholder={t.review}
            rows={3}
            className="mb-3 w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-100"
          />
          <button
            type="submit"
            disabled={submittingRating}
            className="flex items-center gap-2 rounded-full bg-sky-500 px-5 py-2 text-sm font-semibold text-white hover:bg-sky-600 disabled:opacity-60"
          >
            {submittingRating && <Loader2 size={16} className="animate-spin" />}
            {t.submitReview}
          </button>
        </form>
      )}

      {order.rating && (
        <div className="flex items-center gap-2 rounded-2xl bg-emerald-50 p-4 text-sm text-emerald-700">
          <CheckCircle2 size={16} />
          {language === "hi"
            ? "आपने इस ऑर्डर को रेट किया:"
            : "You rated this order:"}{" "}
          {order.rating.rating} / 5
        </div>
      )}

      <div className="flex flex-wrap gap-3 pb-8">
        {isCancellable && (
          <button
            onClick={handleCancel}
            disabled={cancelling}
            className="flex items-center gap-2 rounded-full border border-rose-200 px-5 py-2 text-sm font-semibold text-rose-500 hover:bg-rose-50 disabled:opacity-60"
          >
            {cancelling && <Loader2 size={16} className="animate-spin" />}
            {cancelling ? t.loading : t.cancelOrder}
          </button>
        )}
        <Link
          href={`/support?orderId=${order.id}`}
          className="rounded-full border border-slate-200 px-5 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50"
        >
          {t.raiseComplaint}
        </Link>
      </div>
    </div>
  );
}
