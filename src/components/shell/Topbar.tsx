"use client";

import React, { useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth/client";
import { SocietySwitcher } from "./SocietySwitcher";
import { ImpersonationBanner } from "@/components/auth/ImpersonationBanner";
import { LogOut, User, Shield, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export function Topbar() {
  const router = useRouter();
  const pathname = usePathname();
  const { effectiveUser, currentRole, currentSociety, availableSocieties } = useAuth();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = async () => {
    try {
      setIsLoggingOut(true);
      await fetch("/api/auth/logout", { method: "POST" });
      window.location.href = "/login";
    } catch (err) {
      console.error(err);
      setIsLoggingOut(false);
    }
  };

  const isSuperAdminContext = pathname.startsWith("/superadmin");

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-slate-200">
      <ImpersonationBanner />

      <div className="px-4 sm:px-6 h-14 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          {!isSuperAdminContext && (
            <SocietySwitcher
              currentSocietyId={currentSociety?.id}
              societies={availableSocieties || []}
            />
          )}
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-2 text-xs">
            <div className="w-7 h-7 rounded-full bg-slate-900 text-white flex items-center justify-center font-bold text-[11px]">
              {effectiveUser?.full_name?.[0]?.toUpperCase() || "U"}
            </div>
            <div className="text-left">
              <div className="font-semibold text-slate-800 leading-tight">
                {effectiveUser?.full_name || "User"}
              </div>
              <div className="text-[10px] text-slate-400 font-mono">
                {currentRole || "AUTHENTICATED"}
              </div>
            </div>
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={handleLogout}
            disabled={isLoggingOut}
            className="text-xs h-8 px-2 text-slate-600 hover:text-red-600"
          >
            {isLoggingOut ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <LogOut className="w-3.5 h-3.5" />
            )}
            <span className="ml-1.5 hidden sm:inline">Logout</span>
          </Button>
        </div>
      </div>
    </header>
  );
}

