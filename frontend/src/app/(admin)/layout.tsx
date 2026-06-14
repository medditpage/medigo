"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/hooks/useLanguage";
import LanguageToggle from "@/components/LanguageToggle";
import {
  Pill,
  LayoutGrid,
  Users,
  Truck,
  Store,
  ClipboardList,
  LifeBuoy,
  IndianRupee,
  Settings,
  LogOut,
  Menu,
  X,
  History,
} from "lucide-react";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading, logout } = useAuth();
  const { t } = useLanguage();
  const router = useRouter();
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
    } else if (!loading && user && user.role !== "admin") {
      router.push(user.role === "agent" ? "/agent/dashboard" : "/dashboard");
    }
  }, [loading, user, router]);

  const navItems = [
    { href: "/admin/dashboard", label: t.dashboard, icon: LayoutGrid },
    { href: "/admin/users", label: t.manageUsers, icon: Users },
    { href: "/admin/agents", label: t.manageAgents, icon: Truck },
    { href: "/admin/stores", label: t.manageStores, icon: Store },
    { href: "/admin/orders", label: t.allOrders, icon: ClipboardList },
    { href: "/admin/complaints", label: t.complaints, icon: LifeBuoy },
    { href: "/admin/revenue", label: t.revenue, icon: IndianRupee },
    { href: "/admin/settings", label: t.settings, icon: Settings },
    { href: "/admin/audit-logs", label: "Audit Logs", icon: History },
  ];

  if (loading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-sm text-slate-400">{t.loading}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="sticky top-0 z-30 border-b border-slate-100 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <button
              className="lg:hidden"
              onClick={() => setMenuOpen((p) => !p)}
            >
              {menuOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
            <Link href="/admin/dashboard" className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-sky-500 text-white">
                <Pill size={16} />
              </div>
              <span className="font-bold text-slate-900">
                {t.appName} Admin
              </span>
            </Link>
          </div>

          <div className="flex items-center gap-3">
            <LanguageToggle />
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

      <div className="mx-auto flex max-w-7xl gap-6 px-4 py-6">
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

        <main className="min-w-0 flex-1">{children}</main>
      </div>
    </div>
  );
}
