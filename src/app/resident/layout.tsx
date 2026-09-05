import React from "react";
import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentIdentity } from "@/lib/auth/server";
import { ResidentBottomNav } from "@/components/resident/ResidentBottomNav";
import { ImpersonationBanner } from "@/components/auth/ImpersonationBanner";
import { SocietySwitcher } from "@/components/shell/SocietySwitcher";
import { Building2, Shield, LogOut, Settings, Home, Users, FileText, Bell, User } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function ResidentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const identity = await getCurrentIdentity();
  if (!identity || !identity.isAuthenticated) {
    redirect("/login");
  }

  const society = identity.currentSociety;
  const user = identity.effectiveUser;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col">
      {identity.isImpersonating && <ImpersonationBanner />}

      {/* Top Application Header */}
      <header className="sticky top-0 z-30 bg-white/95 dark:bg-slate-900/95 backdrop-blur border-b border-slate-200 dark:border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Link href="/resident/dashboard" className="flex items-center space-x-2">
              <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center text-white font-bold shadow-sm shadow-blue-500/20">
                DS
              </div>
              <div className="hidden sm:block">
                <span className="text-base font-bold text-slate-900 dark:text-white tracking-tight">
                  DwellSyncHub
                </span>
                <span className="block text-[11px] text-slate-500 font-medium">
                  {society?.name || "Community Portal"}
                </span>
              </div>
            </Link>
          </div>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center space-x-1">
            <Link
              href="/resident/dashboard"
              className="px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            >
              Dashboard
            </Link>
            <Link
              href="/resident/home"
              className="px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            >
              My Home
            </Link>
            <Link
              href="/resident/family"
              className="px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            >
              Family
            </Link>
            <Link
              href="/resident/notices"
              className="px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            >
              Notices
            </Link>
            <Link
              href="/resident/documents"
              className="px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            >
              Documents
            </Link>
            <Link
              href="/resident/community"
              className="px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            >
              Community
            </Link>
            <Link
              href="/resident/society"
              className="px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            >
              Society Info
            </Link>
          </nav>

          {/* Right Header Actions */}
          <div className="flex items-center space-x-3">
            {identity.availableSocieties && identity.availableSocieties.length > 1 && (
              <div className="hidden sm:block">
                <SocietySwitcher
                  societies={identity.availableSocieties}
                  currentSocietyId={society?.id || ""}
                />
              </div>
            )}

            <Link
              href="/resident/profile"
              className="flex items-center space-x-2 p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              title="My Profile"
            >
              <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 font-semibold flex items-center justify-center text-xs">
                {user.display_name?.charAt(0) || user.full_name?.charAt(0) || "R"}
              </div>
              <span className="hidden lg:inline text-xs font-semibold text-slate-700 dark:text-slate-300">
                {user.display_name || user.full_name}
              </span>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Page Content */}
      <main className="flex-1 pb-20 md:pb-8">
        {children}
      </main>

      {/* Mobile Bottom Navigation */}
      <ResidentBottomNav />
    </div>
  );
}
