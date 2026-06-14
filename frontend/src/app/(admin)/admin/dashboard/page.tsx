"use client";
import { useEffect, useState } from "react";

import { useLanguage } from "@/hooks/useLanguage";

import api, { getErrorMessage } from "@/lib/api";

import { DashboardData } from "@/types";

import {
  AlertCircle,
  Package,
  CheckCircle2,
  Activity,
  Users,
  Truck,
  UserCheck,
  Wifi,
  IndianRupee,
  LifeBuoy,
} from "lucide-react";
export default function AdminDashboardPage() {
  const { t, language } = useLanguage();

  const [data, setData] = useState<DashboardData | null>(null);

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const { data } = await api.get("/admin/dashboard");

        setData(data);
      } catch (err) {
        setError(getErrorMessage(err));
      } finally {
        setLoading(false);
      }
    };

    fetchDashboard();

    const interval = setInterval(fetchDashboard, 30000);

    return () => clearInterval(interval);
  }, []);
  if (loading) return <p className="text-sm text-slate-400">{t.loading}</p>;
  if (error || !data) {
    return (
      <div className="flex items-center gap-2 rounded-2xl bg-rose-50 p-4 text-sm text-rose-600">
        <AlertCircle size={16} />

        {error || t.noDataFound}
      </div>
    );
  }
  const cards = [
    {
      label: language === "hi" ? "आज के ऑर्डर" : "Today's Orders",
      value: data.ordersToday,
      icon: Package,
      color: "bg-sky-50 text-sky-500",
    },

    {
      label: t.delivered,
      value: data.deliveredToday,
      icon: CheckCircle2,
      color: "bg-emerald-50 text-emerald-500",
    },

    {
      label: t.activeOrders,
      value: data.activeOrders,
      icon: Activity,
      color: "bg-violet-50 text-violet-500",
    },

    {
      label: language === "hi" ? "कुल मरीज" : "Total Patients",
      value: data.totalPatients,
      icon: Users,
      color: "bg-amber-50 text-amber-500",
    },

    {
      label: language === "hi" ? "सक्रिय एजेंट" : "Approved Agents",
      value: data.totalAgents,
      icon: Truck,
      color: "bg-blue-50 text-blue-500",
    },

    {
      label: t.pendingApproval,
      value: data.pendingAgents,
      icon: UserCheck,
      color: "bg-rose-50 text-rose-500",
    },

    {
      label: language === "hi" ? "ऑनलाइन एजेंट" : "Agents Online",
      value: data.activeAgentsOnline,
      icon: Wifi,
      color: "bg-cyan-50 text-cyan-500",
    },

    {
      label: t.openComplaints || t.complaints,
      value: data.openComplaints,
      icon: LifeBuoy,
      color: "bg-orange-50 text-orange-500",
    },
  ];
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-900">{t.adminDashboard}</h1>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {cards.map((card) => (
          <div
            key={card.label}
            className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
          >
            <div
              className={`flex h-10 w-10 items-center justify-center rounded-xl ${card.color}`}
            >
              <card.icon size={20} />
            </div>
            <p className="mt-3 text-2xl font-bold text-slate-900">
              {card.value}
            </p>
            <p className="text-xs text-slate-500">{card.label}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-500">
              <IndianRupee size={20} />
            </div>
            <div>
              <p className="text-xl font-bold text-slate-900">
                ₹{data.revenueToday.toFixed(2)}
              </p>
              <p className="text-xs text-slate-500">
                {language === "hi" ? "आज की आय" : "Today's Revenue"}
              </p>
            </div>
          </div>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-50 text-sky-500">
              <IndianRupee size={20} />
            </div>
            <div>
              <p className="text-xl font-bold text-slate-900">
                ₹{data.deliveryChargesToday.toFixed(2)}
              </p>
              <p className="text-xs text-slate-500">{t.deliveryCharge}</p>
            </div>
          </div>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-50 text-violet-500">
              <IndianRupee size={20} />
            </div>
            <div>
              <p className="text-xl font-bold text-slate-900">
                ₹{data.platformChargesToday.toFixed(2)}
              </p>
              <p className="text-xs text-slate-500">{t.platformCharge}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
