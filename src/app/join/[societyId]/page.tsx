import React from "react";
import { getSocietyPublicInfo } from "@/lib/services/onboardingVerificationService";
import { JoinSocietyClient } from "./JoinSocietyClient";
import Link from "next/link";
import { Building2, AlertCircle } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function JoinSocietyPage({
  params,
}: {
  params: Promise<{ societyId: string }>;
}) {
  const { societyId } = await params;
  const res = await getSocietyPublicInfo(societyId);

  if (!res.success || !res.data) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center p-6 text-center">
        <div className="max-w-md w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-8 shadow-sm">
          <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center">
            <AlertCircle className="w-8 h-8" />
          </div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-2">
            Society Portal Not Found
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-400 mb-6">
            The onboarding link you followed may be expired, invalid, or the society is currently not accepting self-registration.
          </p>
          <Link
            href="/login"
            className="inline-flex items-center justify-center px-5 py-2.5 rounded-xl bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 text-sm font-medium hover:opacity-90 transition-opacity"
          >
            Go to DwellSync Login
          </Link>
        </div>
      </div>
    );
  }

  const { society, buildings } = res.data;

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 flex flex-col justify-between">
      {/* Brand Header */}
      <header className="border-b border-slate-200/80 dark:border-slate-800/80 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center text-white font-bold shadow-sm">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <span className="font-semibold text-slate-900 dark:text-slate-100 text-base">
                DwellSync
              </span>
              <span className="text-xs text-slate-500 block">Resident Self-Onboarding</span>
            </div>
          </div>
          <Link
            href="/login"
            className="text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:underline"
          >
            Already a member? Sign in
          </Link>
        </div>
      </header>

      {/* Main Form Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-8 flex-1 w-full">
        <JoinSocietyClient society={society} buildings={buildings || []} />
      </main>

      {/* Footer */}
      <footer className="py-6 text-center text-xs text-slate-500 dark:text-slate-400 border-t border-slate-200 dark:border-slate-800">
        Protected by DwellSync Enterprise Society Management Platform. All resident documents are encrypted and accessible only to verified society committee members.
      </footer>
    </div>
  );
}
