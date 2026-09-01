"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth/client";
import { cn } from "@/lib/utils";
import {
  Building2,
  Users,
  Shield,
  Layers,
  DoorOpen,
  Settings,
  Activity,
  UserCheck,
  LayoutDashboard,
  ShieldAlert,
  ChevronRight,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

export function Sidebar({ className }: { className?: string }) {
  const pathname = usePathname();
  const { isSuperAdmin, currentSociety } = useAuth();

  const isSuperAdminContext = pathname.startsWith("/superadmin");

  const superAdminNav = [
    { label: "Platform Overview", href: "/superadmin", icon: LayoutDashboard },
    { label: "Societies Registry", href: "/superadmin/societies", icon: Building2 },
    { label: "Platform Users", href: "/superadmin/users", icon: Users },
    { label: "Impersonation Sessions", href: "/superadmin/impersonate", icon: UserCheck },
    { label: "Platform Audit Log", href: "/superadmin/audit", icon: Activity },
  ];

  const societyId = currentSociety?.id || "default";

  const societyNav = [
    { label: "Dashboard", href: `/society/${societyId}/dashboard`, icon: LayoutDashboard },
    { label: "Buildings & Wings", href: `/society/${societyId}/buildings`, icon: Layers },
    { label: "Units & Flats", href: `/society/${societyId}/units`, icon: DoorOpen },
    { label: "People Directory", href: `/society/${societyId}/people`, icon: Users },
    { label: "Society Settings", href: `/society/${societyId}/society`, icon: Settings },
  ];

  const navItems = isSuperAdminContext ? superAdminNav : societyNav;

  return (
    <aside
      className={cn(
        "w-64 bg-slate-900 text-slate-300 flex flex-col shrink-0 border-r border-slate-800 select-none",
        className
      )}
    >
      {/* Brand Header */}
      <div className="p-4 border-b border-slate-800 flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-bold text-sm shadow">
          D
        </div>
        <div>
          <div className="font-bold text-sm text-white tracking-tight">DwellSync</div>
          <div className="text-[10px] text-slate-400 font-mono">
            {isSuperAdminContext ? "Platform Super Admin" : currentSociety?.name || "Society OS"}
          </div>
        </div>
      </div>

      {/* Nav List */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto text-xs">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href || (item.href !== "/superadmin" && pathname.startsWith(item.href));

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-2.5 px-3 py-2 rounded-lg transition-colors font-medium",
                isActive
                  ? "bg-indigo-600 text-white shadow-sm font-semibold"
                  : "text-slate-400 hover:text-white hover:bg-slate-800/60"
              )}
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span className="truncate">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Footer / Tenant Switch Link */}
      <div className="p-3 border-t border-slate-800 text-[11px] space-y-2">
        {isSuperAdmin && (
          <Link
            href={isSuperAdminContext ? `/society/${societyId}/dashboard` : "/superadmin"}
            className="flex items-center justify-between p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors"
          >
            <span>{isSuperAdminContext ? "Go to Society View" : "Super Admin Console"}</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        )}
      </div>
    </aside>
  );
}

