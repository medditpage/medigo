"use client";
import { useEffect, useState } from "react";
import { useLanguage } from "@/hooks/useLanguage";
import api, { getErrorMessage } from "@/lib/api";
import { AlertCircle, IndianRupee, Calendar } from "lucide-react";
interface DailyMetric {
  id: string;
  metricDate: string;
  totalOrders: number;
  deliveredOrders: number;
  cancelledOrders: number;
  totalRevenue: string;
  deliveryChargesCollected: string;
  platformChargesCollected: string;
  newPatients: number;
  newAgents: number;
  activeAgents: number;
}

interface Totals {
  totalRevenue: number;
  medicineCost: number;
  deliveryCharges: number;
  platformCharges: number;
  tax: number;
  deliveredOrders: number;
}

interface Earning {
  id: string;
  amount: string;
  payoutStatus: string;
  createdAt: string;
  agent: { user: { fullName: string; mobile: string } };
  order: { orderNumber: string; deliveredAt: string | null };
}

export default function AdminRevenuePage() {
  const { t, language } = useLanguage();
  const [metrics, setMetrics] = useState<DailyMetric[]>([]);
  const [totals, setTotals] = useState<Totals | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [earnings, setEarnings] = useState<Earning[]>([]);
  const [payingId, setPayingId] = useState<string | null>(null);
  const [txRefs, setTxRefs] = useState<Record<string, string>>({});

  const [from, setFrom] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().split("T")[0];
  });
  const [to, setTo] = useState(() => new Date().toISOString().split("T")[0]);

  async function fetchData() {
    setLoading(true);
    setError(null);
    try {
      const [{ data }, { data: earningsData }] = await Promise.all([
        api.get("/admin/revenue", { params: { from, to } }),
        api.get("/admin/earnings", { params: { payoutStatus: "pending" } }),
      ]);
      setMetrics(data.metrics);
      setTotals(data.totals);
      setEarnings(earningsData.earnings);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  async function markPaid(earningId: string) {
    setPayingId(earningId);
    try {
      await api.patch(`/admin/earnings/${earningId}/pay`, {
        transactionRef: txRefs[earningId] || null,
      });
      setTxRefs((prev) => {
        const n = { ...prev };
        delete n[earningId];
        return n;
      });
      await fetchData();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setPayingId(null);
    }
  }

  useEffect(() => {
    fetchData();
  }, []);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-900">{t.revenue}</h1>

      {error && (
        <div className="flex items-center gap-2 rounded-2xl bg-rose-50 p-4 text-sm text-rose-600">
          <AlertCircle size={16} />
          {error}
        </div>
      )}

      {/* Date Filter */}
      <div className="flex flex-wrap items-end gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-500">
            From
          </label>
          <input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-100"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-500">
            To
          </label>
          <input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-100"
          />
        </div>
        <button
          onClick={fetchData}
          className="flex items-center gap-1.5 rounded-full bg-sky-500 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-600"
        >
          <Calendar size={14} />
          {language === "hi" ? "फ़िल्टर करें" : "Filter"}
        </button>
      </div>

      {loading ? (
        <p className="text-sm text-slate-400">{t.loading}</p>
      ) : (
        <>
          {totals && (
            <>
              {/* Revenue Cards */}
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
                {[
                  {
                    label: language === "hi" ? "कुल आय" : "Total Revenue",
                    value: totals.totalRevenue,
                  },
                  { label: t.medicineCost, value: totals.medicineCost },
                  { label: t.deliveryCharge, value: totals.deliveryCharges },
                  { label: t.platformCharge, value: totals.platformCharges },
                  { label: t.tax, value: totals.tax },
                ].map((item) => (
                  <div
                    key={item.label}
                    className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
                  >
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-500">
                      <IndianRupee size={16} />
                    </div>
                    <p className="mt-2 text-lg font-bold text-slate-900">
                      ₹{item.value.toFixed(2)}
                    </p>
                    <p className="text-xs text-slate-500">{item.label}</p>
                  </div>
                ))}
              </div>

              <p className="text-sm text-slate-500">
                {language === "hi" ? "डिलीवर हुए ऑर्डर" : "Delivered Orders"}:{" "}
                <span className="font-semibold text-slate-900">
                  {totals.deliveredOrders}
                </span>
              </p>

              {/* Daily Breakdown */}
              <div>
                <h2 className="mb-3 text-lg font-semibold text-slate-900">
                  {language === "hi" ? "दैनिक रिपोर्ट" : "Daily Breakdown"}
                </h2>
                {metrics.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-8 text-center text-sm text-slate-400">
                    {t.noDataFound}
                  </div>
                ) : (
                  <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-slate-100 text-left text-slate-500">
                          <th className="px-4 py-3 font-medium">Date</th>
                          <th className="px-4 py-3 text-right font-medium">
                            Orders
                          </th>
                          <th className="px-4 py-3 text-right font-medium">
                            {t.delivered}
                          </th>
                          <th className="px-4 py-3 text-right font-medium">
                            {t.cancelled}
                          </th>
                          <th className="px-4 py-3 text-right font-medium">
                            Revenue
                          </th>
                          <th className="px-4 py-3 text-right font-medium">
                            New Patients
                          </th>
                          <th className="px-4 py-3 text-right font-medium">
                            New Agents
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {metrics.map((m) => (
                          <tr
                            key={m.id}
                            className="border-b border-slate-50 last:border-0"
                          >
                            <td className="px-4 py-3 font-medium text-slate-900">
                              {new Date(m.metricDate).toLocaleDateString(
                                "en-IN",
                              )}
                            </td>
                            <td className="px-4 py-3 text-right text-slate-600">
                              {m.totalOrders}
                            </td>
                            <td className="px-4 py-3 text-right text-slate-600">
                              {m.deliveredOrders}
                            </td>
                            <td className="px-4 py-3 text-right text-slate-600">
                              {m.cancelledOrders}
                            </td>
                            <td className="px-4 py-3 text-right font-semibold text-slate-900">
                              ₹{Number(m.totalRevenue).toFixed(2)}
                            </td>
                            <td className="px-4 py-3 text-right text-slate-600">
                              {m.newPatients}
                            </td>
                            <td className="px-4 py-3 text-right text-slate-600">
                              {m.newAgents}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </>
          )}

          {/* Pending Payouts */}
          <div>
            <h2 className="mb-3 text-lg font-semibold text-slate-900">
              Pending Agent Payouts
              {earnings.length > 0 && (
                <span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-700">
                  {earnings.length}
                </span>
              )}
            </h2>
            {earnings.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-8 text-center text-sm text-slate-400">
                No pending payouts
              </div>
            ) : (
              <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 text-left text-slate-500">
                      <th className="px-4 py-3 font-medium">Agent</th>
                      <th className="px-4 py-3 font-medium">Mobile</th>
                      <th className="px-4 py-3 font-medium">Order</th>
                      <th className="px-4 py-3 font-medium">Delivered</th>
                      <th className="px-4 py-3 text-right font-medium">
                        Amount
                      </th>
                      <th className="px-4 py-3 font-medium">
                        UPI/Transaction Ref
                      </th>
                      <th className="px-4 py-3 font-medium">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {earnings.map((e) => (
                      <tr
                        key={e.id}
                        className="border-b border-slate-50 last:border-0"
                      >
                        <td className="px-4 py-3 font-medium text-slate-900">
                          {e.agent?.user?.fullName}
                        </td>
                        <td className="px-4 py-3 text-slate-600">
                          {e.agent?.user?.mobile}
                        </td>
                        <td className="px-4 py-3 text-slate-600">
                          {e.order?.orderNumber}
                        </td>
                        <td className="px-4 py-3 text-slate-600">
                          {e.order?.deliveredAt
                            ? new Date(e.order.deliveredAt).toLocaleDateString(
                                "en-IN",
                              )
                            : "-"}
                        </td>
                        <td className="px-4 py-3 text-right font-semibold text-emerald-600">
                          ₹{Number(e.amount).toFixed(2)}
                        </td>
                        <td className="px-4 py-3">
                          <input
                            placeholder="e.g. UPI ref / UTR no."
                            value={txRefs[e.id] || ""}
                            onChange={(ev) =>
                              setTxRefs((prev) => ({
                                ...prev,
                                [e.id]: ev.target.value,
                              }))
                            }
                            className="w-40 rounded-lg border border-slate-200 px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-sky-400"
                          />
                        </td>
                        <td className="px-4 py-3">
                          <button
                            onClick={() => markPaid(e.id)}
                            disabled={payingId === e.id}
                            className="rounded-full bg-emerald-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-600 disabled:opacity-60"
                          >
                            {payingId === e.id ? "Saving..." : "Mark Paid"}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
