"use client";
// src/app/(auth)/agent-register/page.tsx
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { v4 as uuidv4 } from "uuid";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/hooks/useLanguage";
import { useGeolocation } from "@/hooks/useGeolocation";
import LanguageToggle from "@/components/LanguageToggle";
import api from "@/lib/api";
import { Truck, Loader2, MapPin, CheckCircle2, Upload } from "lucide-react";

const VEHICLE_TYPES = [
  "bicycle",
  "motorcycle",
  "scooter",
  "car",
  "van",
] as const;

export default function AgentRegisterPage() {
  const { registerAgent, error } = useAuth();
  const { t } = useLanguage();
  const {
    latitude,
    longitude,
    loading: locLoading,
    error: locError,
    requestLocation,
  } = useGeolocation();
  const router = useRouter();

  const [form, setForm] = useState({
    fullName: "",
    mobile: "",
    email: "",
    password: "",
    addressLine: "",
    city: "",
    state: "",
    pincode: "",
    aadhaarNumber: "",
    vehicleType: "motorcycle",
    vehicleNumber: "",
  });
  const [aadhaarFile, setAadhaarFile] = useState<File | null>(null);
  const [profileFile, setProfileFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  function update(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLocalError(null);

    const required: (keyof typeof form)[] = [
      "fullName",
      "mobile",
      "email",
      "password",
      "addressLine",
      "city",
      "state",
      "pincode",
      "aadhaarNumber",
      "vehicleType",
      "vehicleNumber",
    ];

    for (const field of required) {
      if (!form[field]) {
        setLocalError(t.requiredField);
        return;
      }
    }

    if (form.mobile.length !== 10) {
      setLocalError("Mobile number must be 10 digits");
      return;
    }

    if (form.aadhaarNumber.length !== 12) {
      setLocalError("Aadhaar number must be 12 digits");
      return;
    }

    if (form.password.length < 6) {
      setLocalError("Password must be at least 6 characters");
      return;
    }

    if (!aadhaarFile) {
      setLocalError("Aadhaar card image is required");
      return;
    }

    setSubmitting(true);

    setSubmitting(true);
    try {
      const formData = new FormData();
      Object.entries(form).forEach(([key, value]) =>
        formData.append(key, value),
      );
      if (latitude) formData.append("latitude", String(latitude));
      if (longitude) formData.append("longitude", String(longitude));
      formData.append("aadhaarFile", aadhaarFile);
      if (profileFile) formData.append("profileFile", profileFile);

      await api.post("/auth/register/agent", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      setSuccess(true);
      setTimeout(() => router.push("/login"), 2500);
    } catch (err: any) {
      setLocalError(err.response?.data?.error || err.message || t.error);
    } finally {
      setSubmitting(false);
    }
  }

  if (success) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-sky-50 via-white to-white px-4">
        <div className="w-full max-w-md rounded-3xl border border-slate-100 bg-white p-8 text-center shadow-xl">
          <CheckCircle2 className="mx-auto text-emerald-500" size={48} />
          <h1 className="mt-4 text-xl font-bold text-slate-900">
            {t.pendingApproval}
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            Your application has been submitted. You will be notified once
            approved by admin.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-sky-50 via-white to-white px-4 py-12">
      <div className="absolute right-4 top-4">
        <LanguageToggle />
      </div>

      <div className="w-full max-w-lg rounded-3xl border border-slate-100 bg-white p-8 shadow-xl">
        <div className="mb-6 flex flex-col items-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-sky-500 text-white">
            <Truck size={24} />
          </div>
          <h1 className="mt-3 text-2xl font-bold text-slate-900">
            {t.registerAsAgent}
          </h1>
        </div>

        {(localError || error) && (
          <div className="mb-4 rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-600">
            {localError || error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                {t.fullName}
              </label>
              <input
                type="text"
                value={form.fullName}
                onChange={(e) => update("fullName", e.target.value)}
                className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-100"
                required
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                {t.mobile}
              </label>
              <input
                type="tel"
                value={form.mobile}
                onChange={(e) =>
                  update(
                    "mobile",
                    e.target.value.replace(/\D/g, "").slice(0, 10),
                  )
                }
                className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-100"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                {t.email}
              </label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => update("email", e.target.value)}
                className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-100"
                required
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                {t.password}
              </label>
              <input
                type="password"
                value={form.password}
                onChange={(e) => update("password", e.target.value)}
                className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-100"
                required
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              {t.address}
            </label>
            <input
              type="text"
              value={form.addressLine}
              onChange={(e) => update("addressLine", e.target.value)}
              className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-100"
              required
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                {t.city}
              </label>
              <input
                type="text"
                value={form.city}
                onChange={(e) => update("city", e.target.value)}
                className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-100"
                required
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                {t.state}
              </label>
              <input
                type="text"
                value={form.state}
                onChange={(e) => update("state", e.target.value)}
                className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-100"
                required
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                {t.pincode}
              </label>
              <input
                type="text"
                value={form.pincode}
                onChange={(e) =>
                  update(
                    "pincode",
                    e.target.value.replace(/\D/g, "").slice(0, 6),
                  )
                }
                className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-100"
                required
              />
            </div>
          </div>

          <button
            type="button"
            onClick={requestLocation}
            className="flex items-center gap-2 rounded-full border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
          >
            <MapPin size={16} />
            {locLoading
              ? t.loading
              : latitude && longitude
                ? `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`
                : "Use my current location"}
          </button>
          {locError && <p className="text-xs text-rose-500">{locError}</p>}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                {t.aadhaarNumber}
              </label>
              <input
                type="text"
                value={form.aadhaarNumber}
                onChange={(e) =>
                  update(
                    "aadhaarNumber",
                    e.target.value.replace(/\D/g, "").slice(0, 12),
                  )
                }
                className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-100"
                required
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                {t.vehicleType}
              </label>
              <select
                value={form.vehicleType}
                onChange={(e) => update("vehicleType", e.target.value)}
                className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-100"
              >
                {VEHICLE_TYPES.map((v) => (
                  <option key={v} value={v}>
                    {(t as any)[v]}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              {t.vehicleNumber}
            </label>
            <input
              type="text"
              value={form.vehicleNumber}
              onChange={(e) =>
                update("vehicleNumber", e.target.value.toUpperCase())
              }
              className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-100"
              required
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                {t.aadhaarImage}
              </label>
              <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-dashed border-slate-300 px-4 py-2.5 text-sm text-slate-500 hover:bg-slate-50">
                <Upload size={16} />
                {aadhaarFile ? aadhaarFile.name : "Choose file"}
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => setAadhaarFile(e.target.files?.[0] || null)}
                />
              </label>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                {t.profilePhoto}
              </label>
              <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-dashed border-slate-300 px-4 py-2.5 text-sm text-slate-500 hover:bg-slate-50">
                <Upload size={16} />
                {profileFile ? profileFile.name : "Choose file (optional)"}
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => setProfileFile(e.target.files?.[0] || null)}
                />
              </label>
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="flex w-full items-center justify-center gap-2 rounded-full bg-sky-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-sky-600 disabled:opacity-60"
          >
            {submitting && <Loader2 size={16} className="animate-spin" />}
            {t.register}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-slate-500">
          {t.alreadyHaveAccount}{" "}
          <Link
            href="/login"
            className="font-semibold text-sky-600 hover:underline"
          >
            {t.login}
          </Link>
        </p>
      </div>
    </div>
  );
}
