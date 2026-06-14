"use client";
import { useEffect, useState } from "react";

import { useLanguage } from "@/hooks/useLanguage";

import api, { getErrorMessage } from "@/lib/api";

import { AgentEarning } from "@/types";

import { AlertCircle, Wallet, CheckCircle2, Clock } from "lucide-react";
export default function AgentEarningsPage() {
  const { t, language } = useLanguage();

  const [earnings, setEarnings] = useState<AgentEarning[]>([]);

  const [summary, setSummary] = useState({
    totalEarned: 0,
    totalPending: 0,
    totalPaid: 0,
  });

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    const fetchEarnings = async () => {
      try {
        const { data } = await api.get("/agent/earnings");

        setEarnings(data.earnings);

        setSummary(data.summary);
      } catch (err) {
        setError(getErrorMessage(err));
      } finally {
        setLoading(false);
      }
    };

    fetchEarnings();
  }, []);
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-900">{t.earnings}</h1>
      {error && (
        <div className="flex items-center gap-2 rounded-2xl bg-rose-50 p-4 text-sm text-rose-600">
          <AlertCircle size={16} />
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-50 text-sky-500">
              <Wallet size={20} />
            </div>
            <div>
              <p className="text-xl font-bold text-slate-900">
                ₹{summary.totalEarned.toFixed(2)}
              </p>
              <p className="text-xs text-slate-500">
                {language === "hi" ? "कुल कमाई" : "Total Earned"}
              </p>
            </div>
          </div>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-500">
              <Clock size={20} />
            </div>
            <div>
              <p className="text-xl font-bold text-slate-900">
                ₹{summary.totalPending.toFixed(2)}
              </p>
              <p className="text-xs text-slate-500">
                {language === "hi" ? "लंबित भुगतान" : "Pending Payout"}
              </p>
            </div>
          </div>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-500">
              <CheckCircle2 size={20} />
            </div>
            <div>
              <p className="text-xl font-bold text-slate-900">
                ₹{summary.totalPaid.toFixed(2)}
              </p>
              <p className="text-xs text-slate-500">
                {language === "hi" ? "भुगतान हुआ" : "Paid Out"}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div>
        <h2 className="mb-3 text-lg font-semibold text-slate-900">
          {language === "hi" ? "कमाई का इतिहास" : "Earnings History"}
        </h2>

        {loading ? (
          <p className="text-sm text-slate-400">{t.loading}</p>
        ) : earnings.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-8 text-center text-sm text-slate-400">
            {t.noDataFound}
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-left text-slate-500">
                  <th className="px-4 py-3 font-medium">Order</th>
                  <th className="px-4 py-3 font-medium">Date</th>
                  <th className="px-4 py-3 text-right font-medium">Amount</th>
                  <th className="px-4 py-3 text-right font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {earnings.map((e) => (
                  <tr
                    key={e.id}
                    className="border-b border-slate-50 last:border-0"
                  >
                    <td className="px-4 py-3 font-medium text-slate-900">
                      {e.order?.orderNumber}
                    </td>
                    <td className="px-4 py-3 text-slate-500">
                      {e.order?.deliveredAt
                        ? new Date(e.order.deliveredAt).toLocaleDateString(
                            "en-IN",
                          )
                        : "-"}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-slate-900">
                      ₹{Number(e.amount).toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                          e.payoutStatus === "paid"
                            ? "bg-emerald-100 text-emerald-700"
                            : "bg-amber-100 text-amber-700"
                        }`}
                      >
                        {e.payoutStatus === "paid" ? t.approved : t.pending}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
