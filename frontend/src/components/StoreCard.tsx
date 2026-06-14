import { MedicalStore } from "@/types";
import { MapPin, Phone, Clock } from "lucide-react";

export default function StoreCard({ store }: { store: MedicalStore }) {
  const distance = store.distance_km ?? store.distanceKm;

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-base font-semibold text-slate-900">
            {store.name}
          </h3>
          <p className="mt-1 flex items-center gap-1 text-sm text-slate-500">
            <MapPin size={14} />
            {store.addressLine}, {store.city}
          </p>
        </div>
        {distance !== undefined && (
          <span className="rounded-full bg-sky-50 px-2.5 py-1 text-xs font-semibold text-sky-600">
            {distance} km
          </span>
        )}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-4 border-t border-slate-100 pt-3 text-sm text-slate-600">
        <a
          href={`tel:${store.phone}`}
          className="flex items-center gap-1 text-sky-600 hover:underline"
        >
          <Phone size={14} />
          {store.phone}
        </a>
        {store.opensAt && store.closesAt && (
          <span className="flex items-center gap-1">
            <Clock size={14} />
            {store.opensAt} - {store.closesAt}
          </span>
        )}
      </div>
    </div>
  );
}
