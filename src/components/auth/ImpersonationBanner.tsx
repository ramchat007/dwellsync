"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth/client";
import { ShieldAlert, LogOut, Loader2, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export function ImpersonationBanner() {
  const { isImpersonating, effectiveUser, currentRole, currentSociety, refreshSession } = useAuth();
  const [isExiting, setIsExiting] = useState(false);
  const router = useRouter();

  if (!isImpersonating || !effectiveUser) {
    return null;
  }

  const handleExit = async () => {
    try {
      setIsExiting(true);
      const res = await fetch("/api/auth/impersonate/exit", {
        method: "POST",
      });

      if (res.ok) {
        await refreshSession();
        window.location.href = "/superadmin/view-as";
      } else {
        alert("Failed to exit View-As session. Please try again.");
        setIsExiting(false);
      }
    } catch (err) {
      console.error("Error exiting View-As session:", err);
      alert("Error exiting View-As session.");
      setIsExiting(false);
    }
  };

  const userName = effectiveUser.full_name || effectiveUser.display_name || effectiveUser.email;
  const societyName = currentSociety?.name || "Target Society";

  return (
    <aside
      aria-label="View-As Persona Testing Banner"
      className="sticky top-0 z-[9999] w-full bg-amber-500 text-amber-950 px-4 py-2 shadow-md border-b border-amber-600 transition-all select-none"
    >
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2.5 text-xs">
        <div className="flex items-center gap-2.5">
          <div className="p-1 bg-amber-600/30 rounded-full text-amber-950 font-bold flex items-center justify-center">
            <ShieldAlert className="w-4 h-4" />
          </div>
          <div>
            <span className="font-medium text-amber-900">
              Viewing DwellSync as <strong className="text-amber-950 font-bold underline decoration-amber-700">{userName}</strong>
            </span>
            <span className="mx-2 text-amber-700">&bull;</span>
            <span className="text-amber-900">
              Role: <strong className="text-amber-950 font-semibold">{currentRole || "RESIDENT"}</strong>
            </span>
            <span className="mx-2 text-amber-700">&bull;</span>
            <span className="text-amber-900">
              Society: <strong className="text-amber-950 font-semibold">{societyName}</strong>
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExit}
            disabled={isExiting}
            className="flex items-center gap-1.5 px-3 py-1 bg-amber-950 hover:bg-black text-amber-100 hover:text-white font-semibold rounded-md shadow-xs transition-all duration-150 active:scale-95 disabled:opacity-50 text-[11px]"
          >
            {isExiting ? (
              <>
                <Loader2 className="w-3 h-3 animate-spin" />
                <span>Exiting...</span>
              </>
            ) : (
              <>
                <LogOut className="w-3 h-3" />
                <span>Exit View</span>
              </>
            )}
          </button>
        </div>
      </div>
    </aside>
  );
}
