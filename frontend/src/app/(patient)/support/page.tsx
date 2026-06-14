"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useLanguage } from "@/hooks/useLanguage";
import api, { getErrorMessage } from "@/lib/api";
import { Complaint, Order } from "@/types";
import StatusBadge from "@/components/StatusBadge";
import { AlertCircle, CheckCircle2, LifeBuoy, Loader2 } from "lucide-react";

const CATEGORIES = [
  "wrong_medicine",
  "missing_medicine",
  "damaged_product",
  "late_delivery",
  "overcharging",
  "other",
] as const;

export default function SupportPage() {
  const { t, language } = useLanguage();
  const searchParams = useSearchParams();
  const orderIdParam = searchParams.get("orderId") || "";

  const [orders, setOrders] = useState<Order[]>([]);
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [form, setForm] = useState({
    orderId: orderIdParam,
    category: "wrong_medicine",
    subject: "",
    description: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  async function fetchData() {
    setLoading(true);
    try {
      const [ordersRes, complaintsRes] = await Promise.all([
        api.get("/orders", { params: { status: "history" } }),
        api.get("/patient/complaints"),
      ]);
      setOrders(ordersRes.data.orders);
      setComplaints(complaintsRes.data.complaints);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchData();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!form.subject.trim() || !form.description.trim()) {
      setError(t.requiredField);
      return;
    }

    setSubmitting(true);
    setError(null);
    setSuccess(false);

    try {
      await api.post("/patient/complaints", {
        orderId: form.orderId || undefined,
        category: form.category,
        subject: form.subject,
        description: form.description,
      });
      setSuccess(true);
      setForm({
        orderId: "",
        category: "wrong_medicine",
        subject: "",
        description: "",
      });
      await fetchData();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h1 className="text-2xl font-bold text-slate-900">{t.support}</h1>

      {error && (
        <div className="flex items-center gap-2 rounded-2xl bg-rose-50 p-4 text-sm text-rose-600">
          <AlertCircle size={16} />
          {error}
        </div>
      )}

      {success && (
        <div className="flex items-center gap-2 rounded-2xl bg-emerald-50 p-4 text-sm text-emerald-700">
          <CheckCircle2 size={16} />
          {language === "hi"
            ? "आपकी शिकायत दर्ज कर ली गई है"
            : "Your complaint has been submitted"}
        </div>
      )}

      <form
        onSubmit={handleSubmit}
        className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
      >
        <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
          <LifeBuoy size={16} className="text-sky-500" />
          {t.raiseComplaint}
        </h2>

        {orders.length > 0 && (
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              {language === "hi" ? "ऑर्डर (वैकल्पिक)" : "Order (optional)"}
            </label>
            <select
              value={form.orderId}
              onChange={(e) =>
                setForm((p) => ({ ...p, orderId: e.target.value }))
              }
              className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-100"
            >
              <option value="">
                {language === "hi" ? "सामान्य शिकायत" : "General complaint"}
              </option>
              {orders.map((order) => (
                <option key={order.id} value={order.id}>
                  {order.orderNumber}
                </option>
              ))}
            </select>
          </div>
        )}

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">
            {t.category}
          </label>
          <select
            value={form.category}
            onChange={(e) =>
              setForm((p) => ({ ...p, category: e.target.value }))
            }
            className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-100"
          >
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {(t as any)[c]}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">
            {t.subject}
          </label>
          <input
            type="text"
            value={form.subject}
            onChange={(e) =>
              setForm((p) => ({ ...p, subject: e.target.value }))
            }
            className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-100"
            required
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">
            {t.description}
          </label>
          <textarea
            value={form.description}
            onChange={(e) =>
              setForm((p) => ({ ...p, description: e.target.value }))
            }
            rows={4}
            className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-100"
            required
          />
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="flex w-full items-center justify-center gap-2 rounded-full bg-sky-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-sky-600 disabled:opacity-60"
        >
          {submitting && <Loader2 size={16} className="animate-spin" />}
          {t.submit}
        </button>
      </form>

      <div>
        <h2 className="mb-3 text-lg font-semibold text-slate-900">
          {t.myComplaints}
        </h2>
        {loading ? (
          <p className="text-sm text-slate-400">{t.loading}</p>
        ) : complaints.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-8 text-center text-sm text-slate-400">
            {t.noDataFound}
          </div>
        ) : (
          <div className="space-y-2">
            {complaints.map((c) => (
              <div
                key={c.id}
                className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
              >
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-slate-900">
                    {c.subject}
                  </p>
                  <StatusBadge status={c.status} language={language} />
                </div>
                <p className="mt-1 text-xs text-slate-500">
                  #{c.ticketNumber} · {(t as any)[c.category]}{" "}
                  {c.order ? `· ${c.order.orderNumber}` : ""}
                </p>
                <p className="mt-2 text-sm text-slate-600">{c.description}</p>
                {c.adminResponse && (
                  <div className="mt-2 rounded-xl bg-sky-50 p-3 text-sm text-sky-700">
                    <strong>
                      {language === "hi" ? "प्रतिक्रिया" : "Response"}:
                    </strong>{" "}
                    {c.adminResponse}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
