"use client";

import { useEffect, useState } from "react";
import { useLanguage } from "@/hooks/useLanguage";
import { useGeolocation } from "@/hooks/useGeolocation";
import api, { getErrorMessage } from "@/lib/api";
import { MedicalStore } from "@/types";
import StoreCard from "@/components/StoreCard";
import { AlertCircle, MapPin } from "lucide-react";

export default function NearbyStoresPage() {
  const { t } = useLanguage();
  const {
    latitude,
    longitude,
    loading: locLoading,
    error: locError,
    requestLocation,
  } = useGeolocation();
  const [stores, setStores] = useState<MedicalStore[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    requestLocation();
  }, [requestLocation]);

  useEffect(() => {
    if (latitude === null || longitude === null) return;

    const fetchStores = async () => {
      setLoading(true);
      setError(null);
      try {
        const { data } = await api.get("/patient/stores/nearby", {
          params: { lat: latitude, lng: longitude, radius: 15 },
        });
        setStores(data.stores);
      } catch (err) {
        setError(getErrorMessage(err));
      } finally {
        setLoading(false);
      }
    };

    fetchStores();
  }, [latitude, longitude]);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-900">{t.nearbyStores}</h1>

      {locLoading && <p className="text-sm text-slate-400">{t.loading}</p>}

      {locError && (
        <div className="flex items-center gap-2 rounded-2xl bg-rose-50 p-4 text-sm text-rose-600">
          <AlertCircle size={16} />
          {locError}
          <button
            onClick={requestLocation}
            className="ml-auto flex items-center gap-1 font-semibold text-rose-700 hover:underline"
          >
            <MapPin size={14} />
            Retry
          </button>
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 rounded-2xl bg-rose-50 p-4 text-sm text-rose-600">
          <AlertCircle size={16} />
          {error}
        </div>
      )}

      {loading ? (
        <p className="text-sm text-slate-400">{t.loading}</p>
      ) : stores.length === 0 && !locLoading && !locError ? (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-8 text-center text-sm text-slate-400">
          {t.noDataFound}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {stores.map((store) => (
            <StoreCard key={store.id} store={store} />
          ))}
        </div>
      )}
    </div>
  );
}
