"use client";
// app/page.tsx
import Link from "next/link";
import { useLanguage } from "@/hooks/useLanguage";
import LanguageToggle from "@/components/LanguageToggle";
import { Truck, ShieldCheck, MapPin, Clock, Pill, Users } from "lucide-react";

export default function LandingPage() {
  const { t, language } = useLanguage();

  return (
    <div className="min-h-screen bg-gradient-to-b from-sky-50 via-white to-white">
      <header className="sticky top-0 z-30 border-b border-slate-100 bg-white/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-sky-500 text-white">
              <Pill size={18} />
            </div>
            <span className="text-lg font-bold text-slate-900">
              {t.appName}
            </span>
          </div>

          <div className="flex items-center gap-3">
            <LanguageToggle />
            <Link
              href="/login"
              className="rounded-full border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              {t.login}
            </Link>
            <Link
              href="/register"
              className="rounded-full bg-sky-500 px-4 py-2 text-sm font-medium text-white hover:bg-sky-600"
            >
              {t.getStarted}
            </Link>
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-6xl px-4 py-16 text-center sm:py-24">
        <h1 className="mx-auto max-w-3xl text-4xl font-extrabold tracking-tight text-slate-900 sm:text-5xl">
          {t.landingHeroTitle}
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-base text-slate-600 sm:text-lg">
          {t.landingHeroSubtitle}
        </p>

        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link
            href="/register"
            className="w-full rounded-full bg-sky-500 px-8 py-3 text-base font-semibold text-white shadow-lg shadow-sky-200 hover:bg-sky-600 sm:w-auto"
          >
            {t.registerAsPatient}
          </Link>
          <Link
            href="/agent-register"
            className="w-full rounded-full border border-slate-200 bg-white px-8 py-3 text-base font-semibold text-slate-700 hover:bg-slate-50 sm:w-auto"
          >
            {t.becomeAgent}
          </Link>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-12">
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {[
            {
              icon: Truck,
              title: language === "hi" ? "तेज़ डिलीवरी" : "Fast Delivery",
              desc:
                language === "hi"
                  ? "स्थानीय एजेंट तुरंत आपके पास पहुंचते हैं"
                  : "Local agents reach you in record time",
            },
            {
              icon: ShieldCheck,
              title: language === "hi" ? "सत्यापित एजेंट" : "Verified Agents",
              desc:
                language === "hi"
                  ? "सभी एजेंट आधार-सत्यापित हैं"
                  : "All agents are Aadhaar-verified",
            },
            {
              icon: MapPin,
              title: t.nearbyStores,
              desc:
                language === "hi"
                  ? "अपने नज़दीकी मेडिकल स्टोर खोजें"
                  : "Find medical stores closest to you",
            },
            {
              icon: Clock,
              title: language === "hi" ? "24/7 सहायता" : "24/7 Support",
              desc:
                language === "hi"
                  ? "किसी भी समय हमसे संपर्क करें"
                  : "Reach out to us anytime",
            },
          ].map((feature, idx) => (
            <div
              key={idx}
              className="rounded-2xl border border-slate-100 bg-white p-6 text-center shadow-sm"
            >
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-sky-50 text-sky-500">
                <feature.icon size={22} />
              </div>
              <h3 className="mt-4 text-base font-semibold text-slate-900">
                {feature.title}
              </h3>
              <p className="mt-1 text-sm text-slate-500">{feature.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-4xl px-4 py-16 text-center">
        <div className="rounded-3xl bg-sky-500 p-10 text-white shadow-xl">
          <Users className="mx-auto mb-4" size={32} />
          <h2 className="text-2xl font-bold sm:text-3xl">{t.becomeAgent}</h2>
          <p className="mx-auto mt-2 max-w-xl text-sky-50">
            {language === "hi"
              ? "अपने वाहन से कमाई शुरू करें - बस अपना आधार और वाहन विवरण साझा करें।"
              : "Start earning with your own vehicle - just share your Aadhaar and vehicle details to get approved."}
          </p>
          <Link
            href="/agent-register"
            className="mt-6 inline-block rounded-full bg-white px-8 py-3 text-base font-semibold text-sky-600 hover:bg-sky-50"
          >
            {t.registerAsAgent}
          </Link>
        </div>
      </section>

      <footer className="border-t border-slate-100 py-8 text-center text-sm text-slate-400">
        &copy; {new Date().getFullYear()} {t.appName}.{" "}
        {language === "hi" ? "सर्वाधिकार सुरक्षित।" : "All rights reserved."}
      </footer>
    </div>
  );
}
