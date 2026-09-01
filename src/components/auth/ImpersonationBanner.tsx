"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth/client";
import { ShieldAlert, LogOut, Loader2, ArrowRight } from "lucide-react";

export function ImpersonationBanner() {
  const { isImpersonating, effectiveUser, originalUser, currentRole, currentSociety, refreshSession } = useAuth();
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
        router.push("/superadmin");
        router.refresh();
      } else {
        alert("Failed to exit impersonation. Please try again.");
      }
    } catch (err) {
      console.error("Error exiting impersonation:", err);
      alert("Error exiting impersonation.");
    } finally {
      setIsExiting(false);
    }
  };

  return (
    <aside
      aria-label="Impersonation Status Banner"
      className="sticky top-0 z-[9999] w-full bg-amber-500 text-amber-950 px-4 py-2.5 shadow-md border-b-2 border-amber-600 transition-all"
    >
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-3 text-xs md:text-sm">
        <div className="flex items-center gap-3">
          <div className="p-1.5 bg-amber-600/30 rounded-full text-amber-950 font-bold flex items-center justify-center">
            <ShieldAlert className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2 font-bold tracking-wide uppercase text-amber-950">
              <span>⚠ IMPERSONATION MODE</span>
              <span className="text-[10px] bg-amber-600 text-amber-50 px-1.5 py-0.5 rounded font-mono font-semibold">
                AUDITED SESSION
              </span>
            </div>
            <div className="mt-0.5 text-amber-900 font-medium">
              You are logged in as{" "}
              <strong className="text-amber-950 font-bold underline decoration-amber-700">
                {effectiveUser.full_name || effectiveUser.display_name || effectiveUser.email}
              </strong>{" "}
              ({currentRole || "RESIDENT"})
              {currentSociety ? ` at ${currentSociety.name}` : ""}
              <span className="opacity-80 text-xs ml-2">
                • Original: {originalUser?.full_name || "Super Admin"}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExit}
            disabled={isExiting}
            className="flex items-center gap-2 px-3 py-1.5 bg-amber-950 hover:bg-black text-amber-100 hover:text-white font-semibold rounded-md shadow transition-all duration-150 active:scale-95 disabled:opacity-50 text-xs"
          >
            {isExiting ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Restoring Super Admin...</span>
              </>
            ) : (
              <>
                <LogOut className="w-3.5 h-3.5" />
                <span>EXIT IMPERSONATION</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </>
            )}
          </button>
        </div>
      </div>
    </aside>
  );
}
