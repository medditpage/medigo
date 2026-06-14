"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/hooks/useLanguage";
import api, { getErrorMessage } from "@/lib/api";
import { Order } from "@/types";
import OrderCard from "@/components/OrderCard";
import {
  PlusCircle,
  ClipboardList,
  Store,
  Users,
  AlertCircle,
} from "lucide-react";

export default function PatientDashboard() {
  const { user } = useAuth();
  const { t, language } = useLanguage();
  const [activeOrders, setActiveOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        const { data } = await api.get("/orders", {
          params: { status: "active" },
        });
        setActiveOrders(data.orders);
      } catch (err) {
        setError(getErrorMessage(err));
      } finally {
        setLoading(false);
      }
    };
    fetchOrders();
  }, []);

  const quickLinks = [
    {
      href: "/order/new",
      label: t.orderMedicine,
      icon: PlusCircle,
      color: "bg-sky-500",
    },
    {
      href: "/orders",
      label: t.myOrders,
      icon: ClipboardList,
      color: "bg-emerald-500",
    },
    {
      href: "/stores",
      label: t.nearbyStores,
      icon: Store,
      color: "bg-violet-500",
    },
    {
      href: "/family",
      label: t.familyMembers,
      icon: Users,
      color: "bg-amber-500",
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">
          {t.welcome}, {user?.fullName?.split(" ")[0]}
        </h1>
        <p className="mt-1 text-sm text-slate-500">{t.tagline}</p>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {quickLinks.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="flex flex-col items-center gap-2 rounded-2xl border border-slate-200 bg-white p-4 text-center shadow-sm transition-shadow hover:shadow-md"
          >
            <div
              className={`flex h-11 w-11 items-center justify-center rounded-xl ${link.color} text-white`}
            >
              <link.icon size={20} />
            </div>
            <span className="text-sm font-medium text-slate-700">
              {link.label}
            </span>
          </Link>
        ))}
      </div>

      <div>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">
            {t.activeOrders}
          </h2>
          <Link
            href="/orders"
            className="text-sm font-medium text-sky-600 hover:underline"
          >
            {t.myOrders}
          </Link>
        </div>

        {loading ? (
          <p className="text-sm text-slate-400">{t.loading}</p>
        ) : error ? (
          <div className="flex items-center gap-2 rounded-2xl bg-rose-50 p-4 text-sm text-rose-600">
            <AlertCircle size={16} />
            {error}
          </div>
        ) : activeOrders.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-8 text-center text-sm text-slate-400">
            {t.noDataFound}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {activeOrders.map((order) => (
              <OrderCard key={order.id} order={order} language={language} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
