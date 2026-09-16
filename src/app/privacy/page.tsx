import Link from "next/link";
import { Lock, ArrowLeft, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";

export const metadata = {
  title: "Privacy Policy | DwellSync",
  description: "Privacy Policy and Resident Data Protection Policy for DwellSync Multi-Tenant SaaS Platform",
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* Header */}
      <header className="border-b border-slate-800 bg-slate-900/60 backdrop-blur sticky top-0 z-10 px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 text-white font-bold text-lg">
            <Lock className="w-5 h-5 text-indigo-400" />
            <span>DwellSync</span>
          </Link>
          <Link href="/login">
            <Button variant="outline" size="sm" className="border-slate-700 text-slate-300 hover:text-white text-xs">
              <ArrowLeft className="w-3.5 h-3.5 mr-1.5" /> Back to Sign In
            </Button>
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-4xl mx-auto px-6 py-12 space-y-10">
        <div className="space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-950/80 border border-emerald-700/40 text-emerald-300 text-xs font-semibold">
            Data Protection & Security Standard
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
            Privacy Policy
          </h1>
          <p className="text-sm text-slate-400">
            Last Updated: September 16, 2026 • Version 1.0.0
          </p>
        </div>

        <section className="space-y-4 text-slate-300 text-sm leading-relaxed">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400" /> 1. Commitment to Resident Data Privacy
          </h2>
          <p>
            DwellSync respects the personal privacy of all residents, property owners, committee members, security guards, and society staff. This Privacy Policy details the categories of information collected, the stringent access controls enforced, and our strict commitment to zero third-party monetization of residential data.
          </p>
        </section>

        <section className="space-y-4 text-slate-300 text-sm leading-relaxed">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400" /> 2. Information We Collect
          </h2>
          <ul className="list-disc pl-5 space-y-2 text-slate-300">
            <li>
              <strong>Profile & Contact Information:</strong> Full name, verified email address, phone number, and avatar image (if provided).
            </li>
            <li>
              <strong>Residential Association Data:</strong> Unit numbers, building/wing assignments, ownership deeds, and lease tenancy relationships.
            </li>
            <li>
              <strong>Gate Security & Visitor Records:</strong> Visitor names, vehicle registration numbers, visit timestamps, and host resident approvals. Phone numbers in visitor logs are masked for privacy.
            </li>
            <li>
              <strong>Operational & Financial Records:</strong> Maintenance bills, payment receipts, facility booking requests, helpdesk complaints, and formal voting records.
            </li>
          </ul>
        </section>

        <section className="space-y-4 text-slate-300 text-sm leading-relaxed">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400" /> 3. Strict Tenant Isolation & Row Level Security (RLS)
          </h2>
          <p>
            Every piece of data stored in DwellSync is partitioned by a unique Society Tenant ID. PostgreSQL Row Level Security policies prevent unauthorized access across societies:
          </p>
          <ul className="list-disc pl-5 space-y-2 text-slate-300">
            <li>Residents of Society A can never view, query, or mutate records belonging to Society B.</li>
            <li>Gate security personnel have access strictly to visitor checkpoint logs and resident verification lookups.</li>
            <li>Sensitive financial books and vouchers are restricted to the Hon. Treasurer, Secretary, and designated Statutory Auditor.</li>
          </ul>
        </section>

        <section className="space-y-4 text-slate-300 text-sm leading-relaxed">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400" /> 4. Secret Ballots & Poll Privacy
          </h2>
          <p>
            When community polls or managing committee resolution votes are conducted, individual voting ballots are cryptographically hashed where secret balloting is specified. Aggregated vote tallies are visible to authorized participants without revealing the individual vote choices of specific residents.
          </p>
        </section>

        <section className="space-y-4 text-slate-300 text-sm leading-relaxed">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400" /> 5. Data Retention & Deletion Rights
          </h2>
          <p>
            Upon departing a residential community, a resident&rsquo;s status is transitioned to <code>REMOVED</code>, revoking all active tenant permissions. Society data is retained in accordance with statutory cooperative housing society regulations. Society Administrators may request a full structured export of their society&rsquo;s data at any time.
          </p>
        </section>

        <section className="space-y-4 text-slate-300 text-sm leading-relaxed">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400" /> 6. Zero Third-Party Advertising / Data Selling
          </h2>
          <p className="font-semibold text-emerald-300">
            DwellSync does NOT sell, rent, monetize, or share resident contact information, visitor records, or financial history with third-party advertisers or data brokers under any circumstances.
          </p>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800/80 bg-slate-950 px-6 py-6 text-center text-xs text-slate-500">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <p>&copy; {new Date().getFullYear()} DwellSync. All rights reserved.</p>
          <div className="flex gap-6 text-xs text-slate-400">
            <Link href="/terms" className="hover:text-white transition-colors">Terms of Service</Link>
            <Link href="/privacy" className="hover:text-white transition-colors">Privacy Policy</Link>
            <Link href="/login" className="hover:text-white transition-colors">Sign In</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

