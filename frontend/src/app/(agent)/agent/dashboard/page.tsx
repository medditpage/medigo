"use client";
import { useEffect, useState } from "react";

import Link from "next/link";

import { useAuth } from "@/hooks/useAuth";

import { useLanguage } from "@/hooks/useLanguage";

import api, { getErrorMessage } from "@/lib/api";

import { AssignmentIncoming, Order } from "@/types";

import StatusBadge from "@/components/StatusBadge";

import {
  PackageSearch,
  ClipboardList,
  Wallet,
  Star,
  AlertCircle,
  MapPin,
} from "lucide-react";
export default function AgentDashboard() {
  const { user } = useAuth();

  const { t, language } = useLanguage();

  const [incoming, setIncoming] = useState<AssignmentIncoming[]>([]);

  const [activeOrders, setActiveOrders] = useState<Order[]>([]);

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState<string | null>(null);
  const isApproved = user?.deliveryAgent?.status === "approved";
  async function fetchData() {
    if (!isApproved) {
      setLoading(false);

      return;
    }

    try {
      const [incomingRes, ordersRes] = await Promise.all([
        api.get("/agent/orders/incoming"),

        api.get("/agent/orders", { params: { status: "active" } }),
      ]);

      setIncoming(incomingRes.data.incoming);

      setActiveOrders(ordersRes.data.orders);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    fetchData();

    const interval = setInterval(fetchData, 10000);

    return () => clearInterval(interval);
  }, [isApproved]);
  if (loading) return <p className="text-sm text-slate-400">{t.loading}</p>;
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">
          {t.welcome}, {user?.fullName?.split(" ")[0]}
        </h1>

        {user?.deliveryAgent && (
          <p className="mt-1 flex items-center gap-1 text-sm text-slate-500">
            <Star size={14} className="fill-amber-400 text-amber-400" />
            {Number(user.deliveryAgent.ratingAvg).toFixed(1)} (
            {user.deliveryAgent.ratingCount} reviews) ·{" "}
            {user.deliveryAgent.totalDeliveries} deliveries
          </p>
        )}
      </div>
      {error && (
        <div className="flex items-center gap-2 rounded-2xl bg-rose-50 p-4 text-sm text-rose-600">
          <AlertCircle size={16} />
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Link
          href="/agent/incoming"
          className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition-shadow hover:shadow-md"
        >
          <div className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-50 text-sky-500">
              <PackageSearch size={20} />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900">
                {incoming.length}
              </p>
              <p className="text-xs text-slate-500">{t.incomingOrders}</p>
            </div>
          </div>
        </Link>
        <Link
          href="/agent/orders"
          className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition-shadow hover:shadow-md"
        >
          <div className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-50 text-violet-500">
              <ClipboardList size={20} />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900">
                {activeOrders.length}
              </p>
              <p className="text-xs text-slate-500">{t.activeOrders}</p>
            </div>
          </div>
        </Link>
        <Link
          href="/agent/earnings"
          className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition-shadow hover:shadow-md"
        >
          <div className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-500">
              <Wallet size={20} />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900">{t.earnings}</p>
              <p className="text-xs text-slate-500">
                {language === "hi" ? "विवरण देखें" : "View details"}
              </p>
            </div>
          </div>
        </Link>
      </div>

      {isApproved && incoming.length > 0 && (
        <div>
          <h2 className="mb-3 text-lg font-semibold text-slate-900">
            {t.incomingOrders}
          </h2>
          <div className="space-y-3">
            {incoming.slice(0, 3).map((item) => (
              <Link
                key={item.assignmentId}
                href="/agent/incoming"
                className="block rounded-2xl border border-sky-200 bg-sky-50 p-4 shadow-sm"
              >
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-slate-900">
                    {item.order.orderNumber}
                  </p>
                  <StatusBadge status={item.order.status} language={language} />
                </div>
                <p className="mt-1 flex items-center gap-1 text-xs text-slate-500">
                  <MapPin size={12} />
                  {item.distanceKm} km
                </p>
              </Link>
            ))}
          </div>
        </div>
      )}

      {isApproved && activeOrders.length > 0 && (
        <div>
          <h2 className="mb-3 text-lg font-semibold text-slate-900">
            {t.activeOrders}
          </h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {activeOrders.map((order) => (
              <Link
                key={order.id}
                href={`/agent/orders/${order.id}`}
                className="block rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition-shadow hover:shadow-md"
              >
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-slate-900">
                    {order.orderNumber}
                  </p>
                  <StatusBadge status={order.status} language={language} />
                </div>
                <p className="mt-1 text-xs text-slate-500">
                  {order.patient ? "" : ""}
                  {order.address?.city}
                </p>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
