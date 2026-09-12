import React from "react";
import Link from "next/link";
import { requireCompanyAccess } from "@/lib/auth/server";
import { CompanyService } from "@/lib/services/companyService";
import { CompanySocietySwitcher } from "@/components/shell/CompanySocietySwitcher";
import {
  LayoutDashboard,
  Building2,
  Users2,
  Settings,
  Shield,
  Briefcase,
  ChevronRight,
  ArrowLeft,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default async function CompanyLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ companyId: string }>;
}) {
  const { companyId } = await params;
  const { identity, company, role } = await requireCompanyAccess(companyId);
  const accessibleSocieties = await CompanyService.getUserAccessibleSocieties(
    companyId,
    identity.effectiveUser.id
  );

  const navItems = [
    {
      label: "Dashboard",
      href: `/company/${companyId}/dashboard`,
      icon: LayoutDashboard,
    },
    {
      label: "Managed Societies",
      href: `/company/${companyId}/societies`,
      icon: Building2,
      badge: accessibleSocieties.length.toString(),
    },
    {
      label: "Staff Assignments",
      href: `/company/${companyId}/staff`,
      icon: Users2,
    },
    {
      label: "Company Settings",
      href: `/company/${companyId}/settings`,
      icon: Settings,
    },
  ];

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row">
      {/* Sidebar for Desktop */}
      <aside className="w-full md:w-64 bg-slate-900 text-slate-200 border-r border-slate-800 flex flex-col shrink-0">
        {/* Company Header */}
        <div className="p-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-indigo-600 flex items-center justify-center font-bold text-white shadow-sm">
              <Briefcase className="w-5 h-5" />
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="text-sm font-bold text-white truncate">{company.name}</h2>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="text-[10px] font-mono bg-slate-800 text-indigo-400 px-1.5 py-0.5 rounded">
                  {company.code}
                </span>
                <Badge variant="outline" className="text-[9px] py-0 border-indigo-500/30 text-indigo-300">
                  {role}
                </Badge>
              </div>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-3 space-y-1">
          <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Multi-Society Management
          </div>
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className="flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium text-slate-300 hover:bg-slate-800 hover:text-white transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  <Icon className="w-4 h-4 text-slate-400" />
                  <span>{item.label}</span>
                </div>
                {item.badge && (
                  <span className="text-[10px] bg-slate-800 text-slate-300 px-1.5 py-0.5 rounded-full font-mono">
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* User context footer */}
        <div className="p-4 border-t border-slate-800 flex items-center justify-between text-xs">
          <div className="min-w-0">
            <p className="text-white font-medium truncate">{identity.effectiveUser.full_name}</p>
            <p className="text-slate-400 text-[11px] truncate">{identity.effectiveUser.email}</p>
          </div>
          <Link
            href="/dashboard"
            className="text-slate-400 hover:text-white p-1 rounded hover:bg-slate-800"
            title="Back to Resident Home"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Navbar */}
        <header className="sticky top-0 z-30 bg-white border-b border-slate-200 h-14 px-4 sm:px-6 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="text-xs font-semibold text-slate-500 hidden sm:inline">Active Context:</span>
            <CompanySocietySwitcher societies={accessibleSocieties} companyId={companyId} />
          </div>

          <div className="flex items-center gap-2 text-xs">
            <div className="w-7 h-7 rounded-full bg-slate-900 text-white flex items-center justify-center font-bold text-[11px]">
              {identity.effectiveUser.full_name?.[0]?.toUpperCase() || "U"}
            </div>
            <span className="font-semibold text-slate-700 hidden sm:inline">
              {identity.effectiveUser.full_name}
            </span>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-4 sm:p-6 max-w-7xl w-full mx-auto">{children}</main>
      </div>
    </div>
  );
}

