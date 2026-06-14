"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useLanguage } from "@/hooks/useLanguage";
import api, { getErrorMessage } from "@/lib/api";
import { Notification } from "@/types";
import { Bell, CheckCheck, AlertCircle } from "lucide-react";

export default function NotificationsPage() {
  const { t } = useLanguage();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function fetchNotifications() {
    setLoading(true);
    setError(null);
    try {
      const { data } = await api.get("/patient/notifications");
      setNotifications(data.notifications);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchNotifications();
  }, []);

  async function markAllRead() {
    try {
      await api.patch("/patient/notifications/read-all");
      await fetchNotifications();
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  async function markRead(id: string) {
    try {
      await api.patch(`/patient/notifications/${id}/read`);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)),
      );
    } catch {}
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">{t.notifications}</h1>
        {notifications.some((n) => !n.isRead) && (
          <button
            onClick={markAllRead}
            className="flex items-center gap-1.5 text-sm font-medium text-sky-600 hover:underline"
          >
            <CheckCheck size={16} />
            Mark all read
          </button>
        )}
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-2xl bg-rose-50 p-4 text-sm text-rose-600">
          <AlertCircle size={16} />
          {error}
        </div>
      )}

      {loading ? (
        <p className="text-sm text-slate-400">{t.loading}</p>
      ) : notifications.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-8 text-center text-sm text-slate-400">
          <Bell className="mx-auto mb-2 text-slate-300" size={32} />
          {t.noDataFound}
        </div>
      ) : (
        <div className="space-y-2">
          {notifications.map((n) => {
            const content = (
              <div
                onClick={() => !n.isRead && markRead(n.id)}
                className={`rounded-2xl border p-4 shadow-sm transition-colors ${
                  n.isRead
                    ? "border-slate-100 bg-white"
                    : "border-sky-200 bg-sky-50"
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">
                      {n.title}
                    </p>
                    <p className="mt-0.5 text-sm text-slate-600">{n.message}</p>
                  </div>
                  {!n.isRead && (
                    <span className="mt-1 h-2 w-2 flex-shrink-0 rounded-full bg-sky-500" />
                  )}
                </div>
                <p className="mt-2 text-xs text-slate-400">
                  {new Date(n.createdAt).toLocaleString("en-IN", {
                    dateStyle: "medium",
                    timeStyle: "short",
                  })}
                </p>
              </div>
            );

            return n.orderId ? (
              <Link key={n.id} href={`/orders/${n.orderId}`}>
                {content}
              </Link>
            ) : (
              <div key={n.id}>{content}</div>
            );
          })}
        </div>
      )}
    </div>
  );
}
