// frontend/src/app/(agent)/layout.tsx
"use client";
import { useEffect, useState } from "react";

import { useRouter, usePathname } from "next/navigation";

import Link from "next/link";

import { useAuth } from "@/hooks/useAuth";

import { useLanguage } from "@/hooks/useLanguage";

import LanguageToggle from "@/components/LanguageToggle";

import api from "@/lib/api";

import {
  Pill,
  LayoutGrid,
  PackageSearch,
  ClipboardList,
  Wallet,
  User as UserIcon,
  LogOut,
  Menu,
  X,
} from "lucide-react";
export default function AgentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading, logout } = useAuth();

  const { t } = useLanguage();

  const router = useRouter();

  const pathname = usePathname();

  const [menuOpen, setMenuOpen] = useState(false);

  const [isOnline, setIsOnline] = useState(false);

  const [toggling, setToggling] = useState(false);
  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
    } else if (!loading && user && user.role !== "agent") {
      router.push(user.role === "admin" ? "/admin/dashboard" : "/dashboard");
    } else if (!loading && user && user.deliveryAgent) {
      setIsOnline(user.deliveryAgent.isOnline);
    }
  }, [loading, user, router]);
  async function toggleOnline() {
    setToggling(true);

    const next = !isOnline;

    try {
      let latitude: number | undefined;

      let longitude: number | undefined;
      if (next && typeof navigator !== "undefined" && navigator.geolocation) {
        await new Promise<void>((resolve) => {
          navigator.geolocation.getCurrentPosition(
            (pos) => {
              latitude = pos.coords.latitude;
              longitude = pos.coords.longitude;
              resolve();
            },
            () => resolve(),
            { enableHighAccuracy: true, timeout: 8000 },
          );
        });
      }

      await api.patch("/agent/online-status", {
        isOnline: next,
        latitude,
        longitude,
      });
      setIsOnline(next);
    } catch {
    } finally {
      setToggling(false);
    }
  }
  const navItems = [
    { href: "/agent/dashboard", label: t.dashboard, icon: LayoutGrid },

    { href: "/agent/incoming", label: t.incomingOrders, icon: PackageSearch },

    { href: "/agent/orders", label: t.activeOrders, icon: ClipboardList },

    { href: "/agent/earnings", label: t.earnings, icon: Wallet },

    { href: "/agent/profile", label: t.profile, icon: UserIcon },
  ];
  if (loading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-sm text-slate-400">{t.loading}</p>
      </div>
    );
  }
  const isApproved = user.deliveryAgent?.status === "approved";
  return (
    <div className="min-h-screen bg-slate-50">
      <header className="sticky top-0 z-30 border-b border-slate-100 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <button
              className="lg:hidden"
              onClick={() => setMenuOpen((p) => !p)}
            >
              {menuOpen ? <X size={22} /> : <Menu size={22} />}
            </button>

            <Link href="/agent/dashboard" className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-sky-500 text-white">
                <Pill size={16} />
              </div>

              <span className="font-bold text-slate-900">{t.appName}</span>
            </Link>
          </div>
          <div className="flex items-center gap-3">
            <LanguageToggle />
            {isApproved && (
              <button
                onClick={toggleOnline}
                disabled={toggling}
                className={`flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-semibold transition-colors disabled:opacity-60 ${
                  isOnline
                    ? "bg-emerald-500 text-white"
                    : "bg-slate-200 text-slate-600"
                }`}
              >
                <span
                  className={`h-2 w-2 rounded-full ${isOnline ? "bg-white" : "bg-slate-400"}`}
                />
                {isOnline ? t.goOnline : t.goOffline}
              </button>
            )}
            <button
              onClick={logout}
              className="hidden items-center gap-1.5 rounded-full border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-50 sm:flex"
            >
              <LogOut size={14} />
              {t.logout}
            </button>
          </div>
        </div>

        {menuOpen && (
          <nav className="border-t border-slate-100 px-4 py-2 lg:hidden">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMenuOpen(false)}
                className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium ${
                  pathname === item.href
                    ? "bg-sky-50 text-sky-600"
                    : "text-slate-600 hover:bg-slate-50"
                }`}
              >
                <item.icon size={18} />
                {item.label}
              </Link>
            ))}
            <button
              onClick={logout}
              className="mt-1 flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium text-rose-500 hover:bg-rose-50"
            >
              <LogOut size={18} />
              {t.logout}
            </button>
          </nav>
        )}
      </header>

      <div className="mx-auto flex max-w-6xl gap-6 px-4 py-6">
        <aside className="hidden w-56 flex-shrink-0 lg:block">
          <nav className="space-y-1">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
                  pathname === item.href
                    ? "bg-sky-50 text-sky-600"
                    : "text-slate-600 hover:bg-slate-50"
                }`}
              >
                <item.icon size={18} />
                {item.label}
              </Link>
            ))}
          </nav>
        </aside>

        <main className="min-w-0 flex-1">
          {!isApproved && (
            <div className="mb-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-700">
              {user.deliveryAgent?.status === "pending"
                ? t.pendingApproval +
                  " - " +
                  (t.dashboard === "Dashboard"
                    ? "Your application is under review."
                    : "आपका आवेदन समीक्षा में है।")
                : user.deliveryAgent?.status === "rejected"
                  ? t.rejected
                  : t.banned}
            </div>
          )}
          {children}
        </main>
      </div>
    </div>
  );
}
