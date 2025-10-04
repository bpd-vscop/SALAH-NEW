// filepath: apps/admin/app/(dashboard)/layout.tsx
"use client";

import { useEffect, useMemo, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import clsx from "clsx";
import { Bell, Cog } from "lucide-react";
import { useAdminAuth } from "../../hooks/useAdminAuth";

const NAV_ITEMS = [
  { href: "/", label: "Dashboard" },
  { href: "/analytics", label: "Analytics" },
  { href: "/orders", label: "Orders" },
];

const BRAND_LOGO_URL = "https://i.postimg.cc/nVjjhfsz/qt-q-95.png";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading, user, logout } = useAdminAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace("/login");
    }
  }, [isAuthenticated, isLoading, router]);

  const handleLogout = useCallback(() => {
    logout();
    router.push("/login");
  }, [logout, router]);

  const goToSettings = useCallback(() => {
    router.push("/settings");
  }, [router]);

  if (isLoading || !isAuthenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-blue-600" />
      </div>
    );
  }

  const displayName = useMemo(() => {
    if (!user) return "Admin";
    return `${user.firstName} ${user.lastName}`.trim();
  }, [user]);

  const userAsAny = user as any;
  const avatarUrl: string = userAsAny?.avatarUrl ?? BRAND_LOGO_URL;
  const showPlaceholderAvatars = !userAsAny?.avatarUrl;

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="border-b bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-8">
            <Link href="/" className="flex items-center gap-3">
              <div className="relative h-12 w-12">
                <Image src={BRAND_LOGO_URL} alt="ULKS logo" fill sizes="48px" className="object-contain" priority />
              </div>
              <div className="flex flex-col leading-tight">
                <span className="text-base font-semibold text-gray-900">ULKS</span>
                <span className="text-xs text-gray-500">Admin Dashboard</span>
              </div>
            </Link>

            <div className="flex items-center gap-1 rounded-full bg-gray-100 p-1">
              {NAV_ITEMS.map((item) => {
                const isActive = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={clsx(
                      "rounded-full px-5 py-2 text-sm font-medium transition",
                      isActive
                        ? "bg-gray-900 text-white shadow"
                        : "text-gray-500 hover:text-gray-900",
                    )}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </div>

          <div className="flex items-center gap-5">
            <button
              type="button"
              className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-600 transition hover:text-gray-900"
              aria-label="Notifications"
            >
              <Bell className="h-5 w-5" aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={goToSettings}
              className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-600 transition hover:text-gray-900"
              aria-label="Open settings"
            >
              <Cog className="h-5 w-5" aria-hidden="true" />
            </button>



            <div className="flex items-center gap-3 rounded-full border border-gray-100 bg-white px-3 py-1.5 shadow-sm">
              <div className="relative h-10 w-10 overflow-hidden rounded-full border border-gray-200 bg-gray-100">
                <Image src={avatarUrl} alt="Profile" fill sizes="40px" className="object-cover" />
              </div>
              <div className="hidden text-left text-sm text-gray-700 sm:block">
                <div className="font-medium">{displayName}</div>
                <div className="text-xs text-gray-500">{user?.email ?? ""}</div>
              </div>
              <button
                onClick={handleLogout}
                className="ml-2 hidden rounded-full border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-medium text-red-600 transition hover:bg-red-100 hover:border-red-300 sm:inline-flex"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="mx-auto max-w-7xl px-6 py-8">{children}</main>
    </div>
  );
}


