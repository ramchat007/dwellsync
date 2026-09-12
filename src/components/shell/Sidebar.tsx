"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth/client";
import { getNavigationForRole } from "@/lib/auth/persona";
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
  Receipt,
  FileText,
  Wrench,
  Truck,
  Calendar,
  CheckSquare,
  MessageSquare,
  Sparkles,
  Bell,
  ShieldCheck,
  BarChart3,
  ClipboardList,
  Banknote,
  Boxes,
  Package,
  CreditCard,
  FileSpreadsheet,
  FileCheck2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useTranslation } from "@/lib/i18n/context";

const ICON_MAP: Record<string, React.ElementType> = {
  LayoutDashboard,
  Building2,
  Users,
  Layers,
  DoorOpen,
  Settings,
  Activity,
  UserCheck,
  ShieldAlert,
  Receipt,
  FileText,
  Wrench,
  Truck,
  Calendar,
  CheckSquare,
  MessageSquare,
  Sparkles,
  Bell,
  Shield,
  ShieldCheck,
  BarChart3,
  ClipboardList,
  Banknote,
  Boxes,
  Package,
  CreditCard,
  FileSpreadsheet,
  FileCheck2,
};

export function Sidebar({ className }: { className?: string }) {
  const pathname = usePathname();
  const { currentRole, currentSociety, isSuperAdmin, isImpersonating } = useAuth();
  const { t } = useTranslation();

  // Navigation is strictly derived from effective role and society context
  const navItems = getNavigationForRole(currentRole, currentSociety?.id);

  const isSuperAdminContext = currentRole === "SUPER_ADMIN" && !isImpersonating;

  const getLabel = (label: string): string => {
    switch (label.toLowerCase()) {
      case "dashboard":
        return t("nav.dashboard");
      case "home":
      case "my home":
        return t("nav.home");
      case "dues":
      case "dues & bills":
        return t("nav.dues");
      case "family":
        return t("nav.family");
      case "visitors":
      case "gate passes":
        return t("nav.gatePasses");
      case "complaints":
        return t("nav.complaints");
      case "amenities":
        return t("nav.amenities");
      case "events":
      case "events & polls":
        return t("events.eventsAndPolls");
      case "polls":
        return t("nav.polls");
      case "notices":
        return t("nav.notices");
      case "documents":
        return t("nav.documents");
      case "community":
        return t("nav.community");
      case "society info":
        return t("nav.societyInfo");
      case "accounting":
        return t("nav.accounting");
      case "finance":
        return t("nav.finance");
      case "settings":
        return t("nav.settings");
      case "helpdesk":
        return t("nav.helpdesk");
      default:
        return label;
    }
  };

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
          <div className="font-bold text-sm text-white tracking-tight">DwellSyncHub</div>
          <div className="text-[10px] text-slate-400 font-mono truncate max-w-[170px]">
            {isSuperAdminContext
              ? "Platform Administration"
              : currentSociety?.name || "Society OS"}
          </div>
        </div>
      </div>

      {/* Nav List */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto text-xs">
        {navItems.map((item) => {
          const Icon = ICON_MAP[item.iconName] || LayoutDashboard;
          const isActive =
            pathname === item.href ||
            (item.href !== "/superadmin" &&
              item.href !== "/superadmin/view-as" &&
              item.href !== "/resident/dashboard" &&
              pathname.startsWith(item.href));

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
              <span className="truncate">{getLabel(item.label)}</span>
            </Link>
          );
        })}
      </nav>

      {/* Footer Branding (Strictly Neutral) */}
      <div className="p-3 border-t border-slate-800 text-[11px] text-slate-500 flex items-center justify-between">
        <span className="font-mono text-[10px]">
          {isSuperAdminContext ? "PLATFORM OWNER" : currentRole || "MEMBER"}
        </span>
        <span className="text-[10px]">v1.0</span>
      </div>
    </aside>
  );
}
