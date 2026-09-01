import { redirect } from "next/navigation";
import { getCurrentIdentity } from "@/lib/auth/server";
import Link from "next/link";
import { Shield, ArrowRight, Building2, Lock, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export default async function HomePage() {
  const identity = await getCurrentIdentity();

  if (identity) {
    if (identity.isSuperAdmin && !identity.isImpersonating) {
      redirect("/superadmin");
    } else if (identity.currentSociety) {
      redirect(`/society/${identity.currentSociety.id}/dashboard`);
    } else {
      redirect("/superadmin");
    }
  }

  return (
    <main className="flex-1 flex flex-col items-center justify-center p-6 bg-gradient-to-b from-slate-900 via-slate-950 to-black text-white">
      <div className="max-w-3xl w-full text-center space-y-8 py-12">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-950/80 border border-indigo-700/50 text-indigo-300 text-xs font-semibold uppercase tracking-wider">
          <Shield className="w-4 h-4 text-indigo-400" />
          <span>Housing Society Operating System</span>
        </div>

        <div className="space-y-4">
          <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white via-slate-200 to-slate-400">
            DwellSync
          </h1>
          <p className="text-lg sm:text-xl text-slate-300 max-w-xl mx-auto font-light leading-relaxed">
            &ldquo;Every Rupee. Every Task. Every Decision. Accountable.&rdquo;
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-6 text-left">
          <div className="p-5 rounded-xl bg-slate-900/60 border border-slate-800 backdrop-blur">
            <Building2 className="w-6 h-6 text-indigo-400 mb-3" />
            <h3 className="font-semibold text-white text-sm">Multi-Tenant Isolation</h3>
            <p className="text-xs text-slate-400 mt-1">
              Independent society boundary isolation powered by PostgreSQL RLS.
            </p>
          </div>

          <div className="p-5 rounded-xl bg-slate-900/60 border border-slate-800 backdrop-blur">
            <Lock className="w-6 h-6 text-emerald-400 mb-3" />
            <h3 className="font-semibold text-white text-sm">Super Admin Platform</h3>
            <p className="text-xs text-slate-400 mt-1">
              Centralized platform operations, audits, and real-time society management.
            </p>
          </div>

          <div className="p-5 rounded-xl bg-slate-900/60 border border-slate-800 backdrop-blur">
            <CheckCircle2 className="w-6 h-6 text-amber-400 mb-3" />
            <h3 className="font-semibold text-white text-sm">Secure Impersonation</h3>
            <p className="text-xs text-slate-400 mt-1">
              Audit-logged, server-controlled impersonation with zero password sharing.
            </p>
          </div>
        </div>

        <div className="pt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link href="/login">
            <Button size="lg" className="bg-indigo-600 hover:bg-indigo-500 text-white gap-2 text-base px-8 h-12 shadow-lg shadow-indigo-600/30">
              Sign In to Platform <ArrowRight className="w-4 h-4" />
            </Button>
          </Link>
        </div>
      </div>
    </main>
  );
}
