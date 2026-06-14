import Link from "next/link";
import { Order } from "@/types";
import StatusBadge from "./StatusBadge";
import { Language, getTranslations } from "@/lib/translations";
import { Package, MapPin, Clock } from "lucide-react";

export default function OrderCard({
  order,
  language = "en",
  basePath = "/orders",
}: {
  order: Order;
  language?: Language;
  basePath?: string;
}) {
  const t = getTranslations(language);

  return (
    <Link
      href={`${basePath}/${order.id}`}
      className="block rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition-shadow hover:shadow-md"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-50 text-sky-500">
            <Package size={20} />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-900">
              {order.orderNumber}
            </p>
            <p className="flex items-center gap-1 text-xs text-slate-500">
              <Clock size={12} />
              {new Date(order.createdAt).toLocaleString("en-IN", {
                dateStyle: "medium",
                timeStyle: "short",
              })}
            </p>
          </div>
        </div>
        <StatusBadge status={order.status} language={language} />
      </div>

      <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-3 text-sm">
        <div className="flex items-center gap-1 text-slate-500">
          <MapPin size={14} />
          {order.distanceKm ? `${order.distanceKm} km` : "-"}
        </div>
        <p className="font-semibold text-slate-900">
          {order.totalAmount
            ? `₹${Number(order.totalAmount).toFixed(2)}`
            : t.cod}
        </p>
      </div>
    </Link>
  );
}
