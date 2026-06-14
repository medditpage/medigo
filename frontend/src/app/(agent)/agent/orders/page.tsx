"use client";
import { useEffect, useState } from "react";

import { useLanguage } from "@/hooks/useLanguage";

import api, { getErrorMessage } from "@/lib/api";

import { Order } from "@/types";

import OrderCard from "@/components/OrderCard";

import { AlertCircle } from "lucide-react";
const TABS = ["active", "completed"] as const;
export default function AgentOrdersPage() {
  const { t, language } = useLanguage();

  const [tab, setTab] = useState<(typeof TABS)[number]>("active");

  const [orders, setOrders] = useState<Order[]>([]);

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    const fetchOrders = async () => {
      setLoading(true);

      setError(null);

      try {
        const { data } = await api.get("/agent/orders", {
          params: { status: tab },
        });

        setOrders(data.orders);
      } catch (err) {
        setError(getErrorMessage(err));
      } finally {
        setLoading(false);
      }
    };

    fetchOrders();
  }, [tab]);
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-900">{t.activeOrders}</h1>
      <div className="inline-flex rounded-full border border-slate-200 bg-white p-1">
        {TABS.map((tabKey) => (
          <button
            key={tabKey}
            onClick={() => setTab(tabKey)}
            className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
              tab === tabKey
                ? "bg-sky-500 text-white"
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            {tabKey === "active" ? t.activeOrders : t.orderHistory}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="text-sm text-slate-400">{t.loading}</p>
      ) : error ? (
        <div className="flex items-center gap-2 rounded-2xl bg-rose-50 p-4 text-sm text-rose-600">
          <AlertCircle size={16} />
          {error}
        </div>
      ) : orders.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-8 text-center text-sm text-slate-400">
          {t.noDataFound}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {orders.map((order) => (
            <OrderCard
              key={order.id}
              order={order}
              language={language}
              basePath="/agent/orders"
            />
          ))}
        </div>
      )}
    </div>
  );
}
