"use client";

import { useEffect, useState } from "react";
import { useLanguage } from "@/hooks/useLanguage";
import api, { getErrorMessage } from "@/lib/api";
import { DeliveryAgent } from "@/types";
import StatusBadge from "@/components/StatusBadge";

import {
  AlertCircle,
  CheckCircle2,
  XCircle,
  Ban,
  Star,
  Phone,
  FileBadge,
} from "lucide-react";

const STATUSES = ["all", "pending", "approved", "rejected", "banned"] as const;

export default function AdminAgentsPage() {
  const { t, language } = useLanguage();

  const [agents, setAgents] = useState<DeliveryAgent[]>([]);
  const [status, setStatus] = useState<(typeof STATUSES)[number]>("pending");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actingId, setActingId] = useState<string | null>(null);

  async function fetchAgents() {
    setLoading(true);
    setError(null);

    try {
      const { data } = await api.get("/admin/agents", {
        params: { status },
      });

      setAgents(data.agents);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchAgents();
  }, [status]);

  async function handleApprove(id: string) {
    setActingId(id);

    try {
      await api.patch(`/admin/agents/${id}/approve`);
      await fetchAgents();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setActingId(null);
    }
  }

  async function handleReject(id: string) {
    const reason =
      prompt(
        language === "hi"
          ? "अस्वीकृति का कारण (वैकल्पिक)"
          : "Rejection reason (optional)",
      ) || "";

    setActingId(id);

    try {
      await api.patch(`/admin/agents/${id}/reject`, {
        reason,
      });

      await fetchAgents();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setActingId(null);
    }
  }

  async function handleBanToggle(agent: DeliveryAgent) {
    setActingId(agent.id);

    try {
      await api.patch(`/admin/agents/${agent.id}/ban`, {
        isBanned: agent.status !== "banned",
      });

      await fetchAgents();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setActingId(null);
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-900">{t.manageAgents}</h1>

      {error && (
        <div className="flex items-center gap-2 rounded-2xl bg-rose-50 p-4 text-sm text-rose-600">
          <AlertCircle size={16} />
          {error}
        </div>
      )}

      <div className="inline-flex flex-wrap rounded-full border border-slate-200 bg-white p-1">
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
            {s}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="text-sm text-slate-400">{t.loading}</p>
      ) : agents.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-8 text-center text-sm text-slate-400">
          {t.noDataFound}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {agents.map((agent) => (
            <div
              key={agent.id}
              className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-2xl bg-sky-50 text-sky-500">
                    {agent.profilePhotoUrl ? (
                      <img
                        src={agent.profilePhotoUrl}
                        alt={agent.user?.fullName || "Agent"}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <span className="text-lg font-bold">
                        {agent.user?.fullName?.[0]}
                      </span>
                    )}
                  </div>

                  <div>
                    <p className="text-sm font-semibold text-slate-900">
                      {agent.user?.fullName}
                    </p>

                    <p className="flex items-center gap-1 text-xs text-slate-500">
                      <Phone size={12} />
                      {agent.user?.mobile}
                    </p>
                  </div>
                </div>

                <StatusBadge status={agent.status} language={language} />
              </div>

              <div className="mt-3 grid grid-cols-2 gap-2 border-t border-slate-100 pt-3 text-sm text-slate-600">
                <p>
                  {t.vehicleType}:{" "}
                  <span className="font-medium text-slate-900 capitalize">
                    {agent.vehicleType}
                  </span>
                </p>

                <p>
                  {t.vehicleNumber}:{" "}
                  <span className="font-medium text-slate-900">
                    {agent.vehicleNumber}
                  </span>
                </p>

                <p className="flex items-center gap-1">
                  <FileBadge size={12} />
                  XXXX-{agent.aadhaarNumber?.slice(-4)}
                </p>

                {agent.status === "approved" && (
                  <p className="flex items-center gap-1">
                    <Star size={12} className="fill-amber-400 text-amber-400" />
                    {Number(agent.ratingAvg).toFixed(1)} ({agent.ratingCount})
                  </p>
                )}
              </div>

              {agent.aadhaarImageUrl && (
                <a
                  href={agent.aadhaarImageUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-2 inline-block text-xs font-medium text-sky-600 hover:underline"
                >
                  {language === "hi" ? "आधार देखें" : "View Aadhaar"}
                </a>
              )}

              <div className="mt-3 flex gap-2 border-t border-slate-100 pt-3">
                {agent.status === "pending" && (
                  <>
                    <button
                      onClick={() => handleApprove(agent.id)}
                      disabled={actingId === agent.id}
                      className="flex items-center gap-1.5 rounded-full bg-emerald-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-600 disabled:opacity-60"
                    >
                      <CheckCircle2 size={14} />
                      {t.approve}
                    </button>

                    <button
                      onClick={() => handleReject(agent.id)}
                      disabled={actingId === agent.id}
                      className="flex items-center gap-1.5 rounded-full bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-100 disabled:opacity-60"
                    >
                      <XCircle size={14} />
                      {t.reject}
                    </button>
                  </>
                )}

                {(agent.status === "approved" || agent.status === "banned") && (
                  <button
                    onClick={() => handleBanToggle(agent)}
                    disabled={actingId === agent.id}
                    className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold disabled:opacity-60 ${
                      agent.status === "banned"
                        ? "bg-emerald-50 text-emerald-600 hover:bg-emerald-100"
                        : "bg-rose-50 text-rose-600 hover:bg-rose-100"
                    }`}
                  >
                    <Ban size={14} />
                    {agent.status === "banned" ? t.unban : t.ban}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
