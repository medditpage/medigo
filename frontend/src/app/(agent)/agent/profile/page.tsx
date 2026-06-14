"use client";
import { useAuth } from "@/hooks/useAuth";

import { useLanguage } from "@/hooks/useLanguage";

import StatusBadge from "@/components/StatusBadge";

import { Star, Truck, FileBadge, User as UserIcon, LogOut } from "lucide-react";
export default function AgentProfilePage() {
  const { user, logout } = useAuth();

  const { t, language } = useLanguage();

  const agent = user?.deliveryAgent;
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h1 className="text-2xl font-bold text-slate-900">{t.profile}</h1>
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-2xl bg-sky-50 text-sky-500">
            {agent?.profilePhotoUrl ? (
              <img
                src={agent.profilePhotoUrl}
                alt={user?.fullName}
                className="h-full w-full object-cover"
              />
            ) : (
              <UserIcon size={28} />
            )}
          </div>
          <div>
            <p className="text-lg font-semibold text-slate-900">
              {user?.fullName}
            </p>
            <p className="text-sm text-slate-500">
              {user?.mobile} · {user?.email}
            </p>
            {agent && (
              <div className="mt-1">
                <StatusBadge status={agent.status} language={language} />
              </div>
            )}
          </div>
        </div>

        {agent && (
          <div className="mt-4 grid grid-cols-3 gap-3 border-t border-slate-100 pt-4 text-center">
            <div>
              <p className="flex items-center justify-center gap-1 text-lg font-bold text-slate-900">
                <Star size={16} className="fill-amber-400 text-amber-400" />
                {Number(agent.ratingAvg).toFixed(1)}
              </p>
              <p className="text-xs text-slate-500">
                {agent.ratingCount} reviews
              </p>
            </div>
            <div>
              <p className="text-lg font-bold text-slate-900">
                {agent.totalDeliveries}
              </p>
              <p className="text-xs text-slate-500">
                {language === "hi" ? "डिलीवरी" : "Deliveries"}
              </p>
            </div>
            <div>
              <p className="text-lg font-bold capitalize text-slate-900">
                {(t as any)[agent.vehicleType]}
              </p>
              <p className="text-xs text-slate-500">{agent.vehicleNumber}</p>
            </div>
          </div>
        )}
      </div>

      {agent && (
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-900">
            <Truck size={16} className="text-sky-500" />
            {language === "hi" ? "वाहन विवरण" : "Vehicle Details"}
          </h2>
          <div className="space-y-2 text-sm text-slate-600">
            <p>
              {t.vehicleType}:{" "}
              <span className="font-medium text-slate-900">
                {(t as any)[agent.vehicleType]}
              </span>
            </p>
            <p>
              {t.vehicleNumber}:{" "}
              <span className="font-medium text-slate-900">
                {agent.vehicleNumber}
              </span>
            </p>
          </div>
        </div>
      )}

      {agent && (
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-900">
            <FileBadge size={16} className="text-sky-500" />
            {t.aadhaarNumber}
          </h2>
          <p className="text-sm text-slate-600">
            XXXX-XXXX-{agent.aadhaarNumber.slice(-4)}
          </p>
        </div>
      )}

      <button
        onClick={logout}
        className="flex w-full items-center justify-center gap-2 rounded-full border border-rose-200 px-5 py-2.5 text-sm font-semibold text-rose-500 hover:bg-rose-50"
      >
        <LogOut size={16} />
        {t.logout}
      </button>
    </div>
  );
}
