"use client";
// (auth)/register/page.tsx
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/hooks/useLanguage";
import { useGeolocation } from "@/hooks/useGeolocation";
import LanguageToggle from "@/components/LanguageToggle";
import { Pill, Loader2, MapPin, CheckCircle2, ShieldCheck } from "lucide-react";
import api, { getErrorMessage } from "@/lib/api";

// ─── OTP Step ────────────────────────────────────────────────────────────────
// step 1 = fill form
// step 2 = enter OTP
// step 3 = success
type Step = 1 | 2 | 3;

export default function PatientRegisterPage() {
  const { registerPatient, error } = useAuth();
  const { t } = useLanguage();
  const {
    latitude,
    longitude,
    loading: locLoading,
    error: locError,
    requestLocation,
  } = useGeolocation();
  const router = useRouter();

  const [step, setStep] = useState<Step>(1);
  const [form, setForm] = useState({
    fullName: "",
    mobile: "",
    email: "",
    password: "",
    addressLine: "",
    city: "",
    state: "",
    pincode: "",
  });
  const [otp, setOtp] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [otpSending, setOtpSending] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  function update(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  // ─── Step 1: Validate form then send OTP ───────────────────────────────────
  async function handleSendOtp(e: React.FormEvent) {
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
    if (form.password.length < 6) {
      setLocalError("Password must be at least 6 characters");
      return;
    }

    setOtpSending(true);
    try {
      // 🔴 UPDATE: Changed 'mobile' to 'email' for the backend API
      await api.post("/auth/send-otp", {
        email: form.email,
        purpose: "registration",
      });
      setStep(2);
    } catch (err: any) {
      setLocalError(getErrorMessage(err));
    } finally {
      setOtpSending(false);
    }
  }

  // ─── Step 2: Verify OTP then register ──────────────────────────────────────
  async function handleVerifyAndRegister(e: React.FormEvent) {
    e.preventDefault();
    setLocalError(null);

    if (otp.length !== 6) {
      setLocalError("Please enter the 6-digit OTP");
      return;
    }

    setSubmitting(true);
    try {
      // 🔴 UPDATE: Changed 'mobile' to 'email' to match backend
      await api.post("/auth/verify-otp", {
        email: form.email,
        otp,
        purpose: "registration",
      });

      // Then register
      const result = await registerPatient({ ...form, latitude, longitude });

      if (result.success) {
        setStep(3);
        setTimeout(() => router.push("/login"), 2000);
      } else {
        setLocalError(result.error || t.error);
      }
    } catch (err: any) {
      setLocalError(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  // ─── Resend OTP ────────────────────────────────────────────────────────────
  async function handleResendOtp() {
    setLocalError(null);
    setOtpSending(true);
    try {
      // 🔴 UPDATE: Changed 'mobile' to 'email'
      await api.post("/auth/send-otp", {
        email: form.email,
        purpose: "registration",
      });
      setOtp("");
    } catch (err: any) {
      setLocalError(getErrorMessage(err));
    } finally {
      setOtpSending(false);
    }
  }

  // ─── Success screen ────────────────────────────────────────────────────────
  if (step === 3) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-sky-50 via-white to-white px-4">
        <div className="w-full max-w-md rounded-3xl border border-slate-100 bg-white p-8 text-center shadow-xl">
          <CheckCircle2 className="mx-auto text-emerald-500" size={48} />
          <h1 className="mt-4 text-xl font-bold text-slate-900">
            Registration Successful!
          </h1>
          <p className="mt-2 text-sm text-slate-500">Redirecting to login...</p>
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
            {step === 2 ? <ShieldCheck size={24} /> : <Pill size={24} />}
          </div>
          {/* 🔴 UPDATE: Changed "Verify Mobile" to "Verify Email" */}
          <h1 className="mt-3 text-2xl font-bold text-slate-900">
            {step === 2 ? "Verify Email" : t.registerAsPatient}
          </h1>
          {step === 2 && (
            <p className="mt-1 text-sm text-slate-500">
              OTP sent to {/* 🔴 UPDATE: Show email instead of mobile number */}
              <span className="font-semibold text-slate-700">{form.email}</span>
            </p>
          )}
        </div>

        {(localError || error) && (
          <div className="mb-4 rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-600">
            {localError || error}
          </div>
        )}

        {/* ── Step 1: Registration Form ── */}
        {step === 1 && (
          <form onSubmit={handleSendOtp} className="space-y-4">
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

            <button
              type="submit"
              disabled={otpSending}
              className="flex w-full items-center justify-center gap-2 rounded-full bg-sky-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-sky-600 disabled:opacity-60"
            >
              {otpSending && <Loader2 size={16} className="animate-spin" />}
              {otpSending ? "Sending OTP..." : "Send OTP"}
            </button>
          </form>
        )}

        {/* ── Step 2: OTP Entry ── */}
        {step === 2 && (
          <form onSubmit={handleVerifyAndRegister} className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Enter 6-digit OTP
              </label>
              <input
                type="text"
                value={otp}
                onChange={(e) =>
                  setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))
                }
                placeholder="• • • • • •"
                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-center text-2xl tracking-[0.5em] focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-100"
                autoFocus
                required
              />
              <p className="mt-1.5 text-xs text-slate-400">
                OTP is valid for 10 minutes
              </p>
            </div>

            <button
              type="submit"
              disabled={submitting || otp.length !== 6}
              className="flex w-full items-center justify-center gap-2 rounded-full bg-sky-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-sky-600 disabled:opacity-60"
            >
              {submitting && <Loader2 size={16} className="animate-spin" />}
              {submitting ? "Verifying..." : "Verify & Register"}
            </button>

            <div className="flex items-center justify-between text-sm">
              <button
                type="button"
                onClick={() => {
                  setStep(1);
                  setLocalError(null);
                  setOtp("");
                }}
                className="text-slate-500 hover:text-slate-700"
              >
                ← Edit details
              </button>
              <button
                type="button"
                onClick={handleResendOtp}
                disabled={otpSending}
                className="font-medium text-sky-600 hover:underline disabled:opacity-50"
              >
                {otpSending ? "Sending..." : "Resend OTP"}
              </button>
            </div>
          </form>
        )}

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
