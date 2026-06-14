"use client";
import { useEffect, useState } from "react";

import { useLanguage } from "@/hooks/useLanguage";

import api, { getErrorMessage } from "@/lib/api";

import { AlertCircle, ChevronLeft, ChevronRight, History } from "lucide-react";
interface AuditLog {
  id: string;

  action: string;

  entityType: string;

  entityId: string | null;

  oldValue: any;

  newValue: any;

  createdAt: string;

  actor: { fullName: string; email: string } | null;
}
export default function AdminAuditLogsPage() {
  const { t } = useLanguage();

  const [logs, setLogs] = useState<AuditLog[]>([]);

  const [page, setPage] = useState(1);

  const [total, setTotal] = useState(0);

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState<string | null>(null);

  const limit = 50;
  useEffect(() => {
    const fetchLogs = async () => {
      setLoading(true);

      setError(null);

      try {
        const { data } = await api.get("/admin/audit-logs", {
          params: { page, limit },
        });

        setLogs(data.logs);

        setTotal(data.total);
      } catch (err) {
        setError(getErrorMessage(err));
      } finally {
        setLoading(false);
      }
    };

    fetchLogs();
  }, [page]);
  const totalPages = Math.max(1, Math.ceil(total / limit));
  return (
    <div className="space-y-6">
      <h1 className="flex items-center gap-2 text-2xl font-bold text-slate-900">
        <History size={22} className="text-sky-500" />
        Audit Logs
      </h1>
      {error && (
        <div className="flex items-center gap-2 rounded-2xl bg-rose-50 p-4 text-sm text-rose-600">
          <AlertCircle size={16} />
          {error}
        </div>
      )}

      {loading ? (
        <p className="text-sm text-slate-400">{t.loading}</p>
      ) : logs.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-8 text-center text-sm text-slate-400">
          {t.noDataFound}
        </div>
      ) : (
        <>
          <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-left text-slate-500">
                  <th className="px-4 py-3 font-medium">Actor</th>
                  <th className="px-4 py-3 font-medium">Action</th>
                  <th className="px-4 py-3 font-medium">Entity</th>
                  <th className="px-4 py-3 font-medium">Date</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr
                    key={log.id}
                    className="border-b border-slate-50 last:border-0"
                  >
                    <td className="px-4 py-3 text-slate-600">
                      {log.actor?.fullName || "System"}
                    </td>
                    <td className="px-4 py-3 font-medium text-slate-900">
                      {log.action}
                    </td>
                    <td className="px-4 py-3 text-slate-500">
                      {log.entityType}
                    </td>
                    <td className="px-4 py-3 text-slate-500">
                      {new Date(log.createdAt).toLocaleString("en-IN", {
                        dateStyle: "medium",
                        timeStyle: "short",
                      })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between">
            <p className="text-sm text-slate-500">Total: {total}</p>
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
