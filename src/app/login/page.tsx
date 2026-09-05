import React, { Suspense } from "react";
import { FastLoginForm } from "./FastLoginForm";
import { Loader2 } from "lucide-react";

export const dynamic = "force-dynamic";

export default function LoginPage() {
  return (
    <div className="flex-1 min-h-[calc(100vh-4rem)] flex items-center justify-center p-4 sm:p-6 bg-slate-900 selection:bg-indigo-500 selection:text-white">
      <Suspense
        fallback={
          <div className="flex items-center justify-center p-12 text-slate-400 gap-2">
            <Loader2 className="w-5 h-5 animate-spin text-indigo-500" />
            <span className="text-xs">Loading DwellSyncHub...</span>
          </div>
        }
      >
        <FastLoginForm />
      </Suspense>
    </div>
  );
}
