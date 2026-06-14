"use client";
import { useEffect, useState } from "react";

import Link from "next/link";

import { useLanguage } from "@/hooks/useLanguage";

import api, { getErrorMessage } from "@/lib/api";

import { Order } from "@/types";

import StatusBadge from "@/components/StatusBadge";

import { AlertCircle, ChevronLeft, ChevronRight } from "lucide-react";
const STATUSES = [
  "all",
  "pending",
  "assigned",
  "accepted",
  "purchasing",
  "bill_uploaded",
  "out_for_delivery",
  "delivered",
  "cancelled",
  "expired",
] as const;
export default function AdminOrdersPage() {
  const { t, language } = useLanguage();

  const [orders, setOrders] = useState<Order[]>([]);

  const [status, setStatus] = useState<(typeof STATUSES)[number]>("all");

  const [page, setPage] = useState(1);

  const [total, setTotal] = useState(0);

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState<string | null>(null);

  const limit = 20;
  useEffect(() => {
    const fetchOrders = async () => {
      setLoading(true);

      setError(null);

      try {
        const { data } = await api.get("/admin/orders", {
          params: { status, page, limit },
        });

        setOrders(data.orders);

        setTotal(data.total);
      } catch (err) {
        setError(getErrorMessage(err));
      } finally {
        setLoading(false);
      }
    };

    fetchOrders();
  }, [status, page]);
  const totalPages = Math.max(1, Math.ceil(total / limit));
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-900">{t.allOrders}</h1>
      {error && (
        <div className="flex items-center gap-2 rounded-2xl bg-rose-50 p-4 text-sm text-rose-600">
          <AlertCircle size={16} />
          {error}
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {STATUSES.map((s) => (
          <button
            key={s}
            onClick={() => {
              setStatus(s);
              setPage(1);
            }}
            className={`rounded-full px-3 py-1.5 text-xs font-medium capitalize transition-colors ${
              status === s
                ? "bg-sky-500 text-white"
                : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-100"
            }`}
          >
            {s === "all" ? s : (t as any)[s]}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="text-sm text-slate-400">{t.loading}</p>
      ) : orders.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-8 text-center text-sm text-slate-400">
          {t.noDataFound}
        </div>
      ) : (
        <>
          <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-left text-slate-500">
                  <th className="px-4 py-3 font-medium">Order #</th>
                  <th className="px-4 py-3 font-medium">
                    {language === "hi" ? "मरीज" : "Patient"}
                  </th>
                  <th className="px-4 py-3 font-medium">
                    {language === "hi" ? "एजेंट" : "Agent"}
                  </th>
                  <th className="px-4 py-3 font-medium">{t.status}</th>
                  <th className="px-4 py-3 text-right font-medium">
                    {t.totalAmount}
                  </th>
                  <th className="px-4 py-3 font-medium">Date</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => (
                  <tr
                    key={order.id}
                    className="border-b border-slate-50 last:border-0"
                  >
                    <td className="px-4 py-3 font-medium text-sky-600">
                      <Link
                        href={`/admin/orders/${order.id}`}
                        className="hover:underline"
                      >
                        {order.orderNumber}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {(order as any).patient?.fullName}
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {order.agent?.user?.fullName || "-"}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={order.status} language={language} />
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-slate-900">
                      {order.totalAmount
                        ? `₹${Number(order.totalAmount).toFixed(2)}`
                        : "-"}
                    </td>
                    <td className="px-4 py-3 text-slate-500">
                      {new Date(order.createdAt).toLocaleDateString("en-IN")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between">
            <p className="text-sm text-slate-500">
              {language === "hi" ? "कुल" : "Total"}: {total}
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="rounded-full border border-slate-200 p-2 hover:bg-slate-50 disabled:opacity-40"
              >
                <ChevronLeft size={16} />
              </button>
              <span className="text-sm text-slate-600">
                {page} / {totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="rounded-full border border-slate-200 p-2 hover:bg-slate-50 disabled:opacity-40"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
