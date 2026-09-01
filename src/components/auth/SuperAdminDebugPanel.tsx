"use client";

import React, { useState } from "react";
import { useAuth } from "@/lib/auth/client";
import { Terminal, ChevronUp, ChevronDown, CheckCircle2, Shield } from "lucide-react";

export function SuperAdminDebugPanel() {
  const { isSuperAdmin, isImpersonating, originalUser, effectiveUser, currentRole, currentSociety, permissions } =
    useAuth();
  const [isOpen, setIsOpen] = useState(false);

  if (!isSuperAdmin) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 font-sans text-xs">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900/90 text-slate-200 hover:text-white hover:bg-slate-900 border border-slate-700 rounded-full shadow-lg backdrop-blur transition-all"
        title="Super Admin Identity & Security Debug Panel"
      >
        <Terminal className="w-3.5 h-3.5 text-emerald-400" />
        <span className="font-mono font-medium">Security Debug Context</span>
        {isImpersonating && (
          <span className="inline-block w-2 h-2 rounded-full bg-amber-400 animate-ping" />
        )}
        {isOpen ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
      </button>

      {isOpen && (
        <div className="mt-2 w-96 max-h-[480px] overflow-y-auto bg-slate-950/95 border border-slate-800 rounded-lg shadow-2xl p-4 text-slate-300 backdrop-blur">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-3">
            <div className="flex items-center gap-2 text-emerald-400 font-mono font-semibold">
              <Shield className="w-4 h-4" />
              <span>SUPER ADMIN CONTEXT</span>
            </div>
            <span
              className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                isImpersonating
                  ? "bg-amber-950 text-amber-300 border border-amber-800"
                  : "bg-emerald-950 text-emerald-300 border border-emerald-800"
              }`}
            >
              {isImpersonating ? "IMPERSONATION ACTIVE" : "ORIGINAL SUPER ADMIN"}
            </span>
          </div>

          <div className="space-y-2.5 font-mono text-[11px]">
            <div>
              <span className="text-slate-500 block">Original User (Admin):</span>
              <div className="text-slate-200 font-semibold truncate">
                {originalUser?.full_name} ({originalUser?.email})
              </div>
              <div className="text-slate-500 text-[10px] truncate">ID: {originalUser?.id}</div>
            </div>

            <div>
              <span className="text-slate-500 block">Effective User (Target):</span>
              <div className="text-slate-200 font-semibold truncate">
                {effectiveUser?.full_name} ({effectiveUser?.email})
              </div>
              <div className="text-slate-500 text-[10px] truncate">ID: {effectiveUser?.id}</div>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-1">
              <div>
                <span className="text-slate-500 block">Effective Role:</span>
                <span className="inline-block px-1.5 py-0.5 bg-slate-800 text-cyan-300 rounded font-bold">
                  {currentRole || "None"}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block">Tenant / Society:</span>
                <span className="text-slate-200 truncate block">
                  {currentSociety ? currentSociety.name : "Platform Level"}
                </span>
                {currentSociety && (
                  <span className="text-slate-500 text-[9px] truncate block">
                    {currentSociety.id}
                  </span>
                )}
              </div>
            </div>

            <div className="pt-2 border-t border-slate-800">
              <span className="text-slate-500 block mb-1">
                Active Permissions ({permissions.length}):
              </span>
              <div className="flex flex-wrap gap-1 max-h-32 overflow-y-auto p-1.5 bg-slate-900/80 rounded border border-slate-800/80">
                {permissions.map((perm) => (
                  <span
                    key={perm}
                    className="flex items-center gap-1 text-[10px] px-1.5 py-0.5 bg-slate-800/70 text-slate-300 rounded"
                  >
                    <CheckCircle2 className="w-2.5 h-2.5 text-emerald-400" />
                    {perm}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
