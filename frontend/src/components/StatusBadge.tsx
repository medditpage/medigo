import { OrderStatus, ComplaintStatus, AgentStatus } from "@/types";
import { Language, getTranslations } from "@/lib/translations";

type StatusType = OrderStatus | ComplaintStatus | AgentStatus | string;

const STATUS_STYLES: Record<string, string> = {
  pending: "bg-amber-100 text-amber-700 border-amber-200",
  assigned: "bg-blue-100 text-blue-700 border-blue-200",
  accepted: "bg-indigo-100 text-indigo-700 border-indigo-200",
  purchasing: "bg-violet-100 text-violet-700 border-violet-200",
  bill_uploaded: "bg-cyan-100 text-cyan-700 border-cyan-200",
  out_for_delivery: "bg-orange-100 text-orange-700 border-orange-200",
  delivered: "bg-emerald-100 text-emerald-700 border-emerald-200",
  cancelled: "bg-rose-100 text-rose-700 border-rose-200",
  expired: "bg-slate-100 text-slate-600 border-slate-200",
  open: "bg-amber-100 text-amber-700 border-amber-200",
  in_progress: "bg-blue-100 text-blue-700 border-blue-200",
  resolved: "bg-emerald-100 text-emerald-700 border-emerald-200",
  approved: "bg-emerald-100 text-emerald-700 border-emerald-200",
  rejected: "bg-rose-100 text-rose-700 border-rose-200",
  banned: "bg-slate-200 text-slate-700 border-slate-300",
};

export default function StatusBadge({
  status,
  language = "en",
}: {
  status: StatusType;
  language?: Language;
}) {
  const t = getTranslations(language);
  const label =
    (t as Record<string, string>)[status] || status.replace(/_/g, " ");
  const style =
    STATUS_STYLES[status] || "bg-slate-100 text-slate-600 border-slate-200";

  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium capitalize ${style}`}
    >
      {label}
    </span>
  );
}
