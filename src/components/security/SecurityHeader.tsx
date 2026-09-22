"use client";

import React, { useState } from "react";
import Link from "next/link";
import { ShieldCheck, LogOut, Loader2, User } from "lucide-react";
import { Profile, Society } from "@/lib/types/database";

interface SecurityHeaderProps {
  profile: Profile;
  society: Society | null;
}

export function SecurityHeader({ profile, society }: SecurityHeaderProps) {
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = async () => {
    try {
      setIsLoggingOut(true);
      await fetch("/api/auth/logout", { method: "POST" });
      window.location.href = "/login";
    } catch (err) {
      console.error("Logout failed:", err);
      setIsLoggingOut(false);
    }
  };

  return (
    <header className="sticky top-0 z-30 bg-slate-900 border-b border-slate-800 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        {/* Left: Branding & Society */}
        <div className="flex items-center space-x-3">
          <Link href="/security/dashboard" className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-500 flex items-center justify-center text-slate-950 font-black shadow-sm shadow-amber-500/20">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <span className="text-sm font-bold text-white tracking-tight flex items-center gap-1.5">
                <span>DwellSync</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400 border border-amber-500/30 uppercase font-mono">
                  Gate
                </span>
              </span>
              <span className="block text-[11px] text-slate-400 font-medium truncate max-w-[200px] sm:max-w-xs">
                {society?.name || "Housing Society"}
              </span>
            </div>
          </Link>
        </div>

        {/* Right: Officer Profile & Logout Button */}
        <div className="flex items-center space-x-3">
          <div className="hidden sm:flex items-center space-x-2 text-right">
            <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 text-amber-400 font-bold flex items-center justify-center text-xs">
              {profile.display_name?.charAt(0) || profile.full_name?.charAt(0) || "S"}
            </div>
            <div className="text-left">
              <div className="text-xs font-semibold text-white truncate max-w-[140px]">
                {profile.display_name || profile.full_name || "Security Officer"}
              </div>
              <div className="text-[10px] text-slate-400 font-mono">Duty Guard</div>
            </div>
          </div>

          {/* Prominent Logout Button */}
          <button
            onClick={handleLogout}
            disabled={isLoggingOut}
            title="Log Out of Security Portal"
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-rose-950/70 border border-slate-700 hover:border-rose-800/80 text-slate-300 hover:text-rose-200 transition text-xs font-semibold"
          >
            {isLoggingOut ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin text-rose-400" />
            ) : (
              <LogOut className="w-3.5 h-3.5 text-rose-400" />
            )}
            <span>Log Out</span>
          </button>
        </div>
      </div>
    </header>
  );
}

