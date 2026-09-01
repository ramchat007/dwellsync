import { redirect } from "next/navigation";
import { getCurrentIdentity } from "@/lib/auth/server";
import { resolveUserExperience } from "@/lib/auth/persona";
import Link from "next/link";
import {
  Building2,
  Users,
  ShieldCheck,
  Receipt,
  DoorOpen,
  ArrowRight,
  Sparkles,
  CheckCircle2,
  Lock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const identity = await getCurrentIdentity();

  if (identity && identity.isAuthenticated) {
    const { dashboardPath } = resolveUserExperience(identity);
    redirect(dashboardPath);
  }

  return (
    <main className="flex-1 flex flex-col items-center justify-center p-6 bg-gradient-to-b from-slate-900 via-slate-950 to-black text-white selection:bg-indigo-500 selection:text-white">
      <div className="max-w-4xl w-full text-center space-y-8 py-12">
        {/* Brand Pill */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-indigo-950/80 border border-indigo-700/50 text-indigo-300 text-xs font-semibold uppercase tracking-wider">
          <Building2 className="w-4 h-4 text-indigo-400" />
          <span>Housing Society Operating System</span>
        </div>

        {/* Hero Title */}
        <div className="space-y-4">
          <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white via-slate-200 to-slate-400">
            DwellSync
          </h1>
          <p className="text-lg sm:text-2xl text-slate-300 max-w-2xl mx-auto font-light leading-relaxed">
            &ldquo;Every Rupee. Every Task. Every Decision. Accountable.&rdquo;
          </p>
          <p className="text-xs sm:text-sm text-slate-400 max-w-xl mx-auto leading-relaxed">
            The unified digital management platform for housing societies, apartment complexes, gated communities, and property management organizations.
          </p>
        </div>

        {/* Feature Cards Grid (Strictly Role-Neutral) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-6 text-left">
          <div className="p-5 rounded-xl bg-slate-900/60 border border-slate-800 hover:border-indigo-500/50 transition-all backdrop-blur shadow-sm">
            <Building2 className="w-6 h-6 text-indigo-400 mb-3" />
            <h3 className="font-bold text-white text-sm">Society Management</h3>
            <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
              Towers, wings, floors, unit allocations, multi-owner equity, and tenant lease management.
            </p>
          </div>

          <div className="p-5 rounded-xl bg-slate-900/60 border border-slate-800 hover:border-emerald-500/50 transition-all backdrop-blur shadow-sm">
            <Users className="w-6 h-6 text-emerald-400 mb-3" />
            <h3 className="font-bold text-white text-sm">Resident Experience</h3>
            <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
              Family member rosters, digital notices, maintenance dues, and instant helpdesk requests.
            </p>
          </div>

          <div className="p-5 rounded-xl bg-slate-900/60 border border-slate-800 hover:border-amber-500/50 transition-all backdrop-blur shadow-sm">
            <ShieldCheck className="w-6 h-6 text-amber-400 mb-3" />
            <h3 className="font-bold text-white text-sm">Gate & Security</h3>
            <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
              Digital visitor check-in, delivery passes, vehicle monitoring, and 24/7 gate security.
            </p>
          </div>

          <div className="p-5 rounded-xl bg-slate-900/60 border border-slate-800 hover:border-cyan-500/50 transition-all backdrop-blur shadow-sm">
            <Receipt className="w-6 h-6 text-cyan-400 mb-3" />
            <h3 className="font-bold text-white text-sm">Financial Governance</h3>
            <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
              Transparent ledger accounting, automated billing, vendor management, and audit trails.
            </p>
          </div>
        </div>

        {/* CTA Button */}
        <div className="pt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link href="/login">
            <Button
              size="lg"
              className="bg-indigo-600 hover:bg-indigo-500 text-white gap-2 text-sm sm:text-base px-8 h-12 shadow-lg shadow-indigo-600/30 font-semibold"
            >
              <span>Sign In to DwellSync</span>
              <ArrowRight className="w-4 h-4" />
            </Button>
          </Link>
        </div>

        {/* Trust Badges */}
        <div className="pt-6 border-t border-slate-800/80 flex flex-wrap items-center justify-center gap-6 text-[11px] font-medium text-slate-500">
          <span className="flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> PostgreSQL RLS Isolation
          </span>
          <span className="flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> Multi-Tenant Boundaries
          </span>
          <span className="flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> Immutable Audit Ledger
          </span>
        </div>
      </div>
    </main>
  );
}
