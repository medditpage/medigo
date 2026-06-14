"use client";
import { useEffect, useState } from "react";

import { useLanguage } from "@/hooks/useLanguage";

import api, { getErrorMessage } from "@/lib/api";

import { Complaint } from "@/types";

import StatusBadge from "@/components/StatusBadge";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import { AlertCircle, MessageSquare, Loader2 } from "lucide-react";
import { translations } from "@/lib/translations";
const STATUSES = ["all", "open", "in_progress", "resolved"] as const;
export default function AdminComplaintsPage() {
  const { t, language } = useLanguage();

  const [complaints, setComplaints] = useState<Complaint[]>([]);

  const [status, setStatus] = useState<(typeof STATUSES)[number]>("open");

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const [editing, setEditing] = useState<Complaint | null>(null);

  const [form, setForm] = useState({ status: "open", adminResponse: "" });

  const [submitting, setSubmitting] = useState(false);
  async function fetchComplaints() {
    setLoading(true);

    setError(null);

    try {
      const { data } = await api.get("/admin/complaints", {
        params: { status },
      });

      setComplaints(data.complaints);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    fetchComplaints();
  }, [status]);
  function openRespond(complaint: Complaint) {
    setEditing(complaint);

    setForm({
      status: complaint.status,
      adminResponse: complaint.adminResponse || "",
    });

    setDialogOpen(true);
  }
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!editing) return;
    setSubmitting(true);
    setError(null);
    try {
      await api.patch(`/admin/complaints/${editing.id}`, form);
      setDialogOpen(false);
      await fetchComplaints();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-900">{t.complaints}</h1>
      {error && (
        <div className="flex items-center gap-2 rounded-2xl bg-rose-50 p-4 text-sm text-rose-600">
          <AlertCircle size={16} />
          {error}
        </div>
      )}

      <div className="inline-flex rounded-full border border-slate-200 bg-white p-1">
        {STATUSES.map((s) => (
          <button
            key={s}
            onClick={() => setStatus(s)}
            className={`rounded-full px-4 py-1.5 text-sm font-medium capitalize transition-colors ${
              status === s
                ? "bg-sky-500 text-white"
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            {s === "all" ? s : (t as any)[s]}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="text-sm text-slate-400">{t.loading}</p>
      ) : complaints.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-8 text-center text-sm text-slate-400">
          {t.noDataFound}
        </div>
      ) : (
        <div className="space-y-3">
          {complaints.map((c) => (
            <div
              key={c.id}
              className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-slate-900">
                    {c.subject}
                  </p>
                  <p className="text-xs text-slate-500">
                    #{c.ticketNumber} · {(t as any)[c.category]}{" "}
                    {c.order ? `· ${c.order.orderNumber}` : ""}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    {c.user?.fullName} ({c.user?.mobile})
                  </p>
                </div>
                <StatusBadge status={c.status} language={language} />
              </div>
              <p className="mt-2 text-sm text-slate-600">{c.description}</p>
              {c.adminResponse && (
                <div className="mt-2 rounded-xl bg-sky-50 p-3 text-sm text-sky-700">
                  <strong>
                    {language === "hi" ? "प्रतिक्रिया" : "Response"}:
                  </strong>{" "}
                  {c.adminResponse}
                </div>
              )}
              <button
                onClick={() => openRespond(c)}
                className="mt-3 flex items-center gap-1.5 rounded-full border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50"
              >
                <MessageSquare size={14} />
                {language === "hi" ? "जवाब दें" : "Respond"}
              </button>
            </div>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent onClose={() => setDialogOpen(false)}>
          <DialogHeader>
            <DialogTitle>
              {language === "hi"
                ? "शिकायत का जवाब दें"
                : "Respond to Complaint"}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                {t.status}
              </label>
              <select
                value={form.status}
                onChange={(e) =>
                  setForm((p) => ({ ...p, status: e.target.value }))
                }
                className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-100"
              >
                <option value="open">{t.open}</option>
                <option value="in_progress">{t.in_progress}</option>
                <option value="resolved">{t.resolved}</option>
              </select>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                {language === "hi" ? "प्रशासक प्रतिक्रिया" : "Admin Response"}
              </label>
              <textarea
                value={form.adminResponse}
                onChange={(e) =>
                  setForm((p) => ({ ...p, adminResponse: e.target.value }))
                }
                rows={4}
                className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-100"
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
        </DialogContent>
      </Dialog>
    </div>
  );
}
