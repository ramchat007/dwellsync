import Link from "next/link";
import { Shield, ArrowLeft, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

export const metadata = {
  title: "Terms of Service | DwellSync",
  description: "Terms of Service and Customer Agreement for DwellSync Multi-Tenant SaaS Platform",
};

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* Header */}
      <header className="border-b border-slate-800 bg-slate-900/60 backdrop-blur sticky top-0 z-10 px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 text-white font-bold text-lg">
            <Shield className="w-5 h-5 text-indigo-400" />
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
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-950/80 border border-indigo-700/40 text-indigo-300 text-xs font-semibold">
            Legal Terms & Customer Agreement
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
            Terms of Service
          </h1>
          <p className="text-sm text-slate-400">
            Last Updated: September 16, 2026 • Version 1.0.0
          </p>
        </div>

        <section className="space-y-4 text-slate-300 text-sm leading-relaxed">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-indigo-400" /> 1. Acceptance of Terms
          </h2>
          <p>
            By accessing, creating an account, or otherwise using DwellSync (&ldquo;the Platform&rdquo;), you (&ldquo;Customer&rdquo;, &ldquo;Society Administrator&rdquo;, or &ldquo;Resident&rdquo;) agree to be legally bound by these Terms of Service. If you are accepting on behalf of a cooperative housing society, resident welfare association, or property management organization, you represent and warrant that you possess the necessary legal authority to bind said entity.
          </p>
        </section>

        <section className="space-y-4 text-slate-300 text-sm leading-relaxed">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-indigo-400" /> 2. Multi-Tenant SaaS Architecture & Tenant Isolation
          </h2>
          <p>
            DwellSync operates on a strictly partitioned multi-tenant architecture utilizing PostgreSQL Row Level Security (RLS). Each housing society maintains independent data isolation. Society Administrators are granted administrative privileges strictly within their assigned tenant boundary. Any attempt to bypass tenant boundaries, execute cross-tenant requests, or tamper with authorization parameters constitutes a breach of these Terms and will result in immediate termination of access.
          </p>
        </section>

        <section className="space-y-4 text-slate-300 text-sm leading-relaxed">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-indigo-400" /> 3. Resident & Society Administrator Responsibilities
          </h2>
          <ul className="list-disc pl-5 space-y-2 text-slate-300">
            <li>
              <strong>Account Credential Security:</strong> Users are responsible for safeguarding login credentials and one-time passwords (OTPs). You must notify DwellSync immediately upon discovering any unauthorized session activity.
            </li>
            <li>
              <strong>Data Accuracy:</strong> Society Administrators are responsible for ensuring that unit rosters, ownership records, and resident access approvals accurately reflect the actual membership of their community.
            </li>
            <li>
              <strong>Visitor Management:</strong> Gate security logs and visitor verification codes are recorded for community safety. Security personnel and residents must not misrepresent visitor identities.
            </li>
          </ul>
        </section>

        <section className="space-y-4 text-slate-300 text-sm leading-relaxed">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-indigo-400" /> 4. Fees, Billing & Subscription Quotas
          </h2>
          <p>
            Subscription plans are tiered based on unit quotas and feature entitlements. Overages beyond assigned unit limits may require subscription plan upgrades. Maintenance billing generated within individual societies represents obligations between the resident and the housing society; DwellSync acts solely as a technological facilitator and ledger recording system.
          </p>
        </section>

        <section className="space-y-4 text-slate-300 text-sm leading-relaxed">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-indigo-400" /> 5. Service Availability & Audit Logs
          </h2>
          <p>
            DwellSync employs redundant cloud hosting with automated database replication to deliver 99.9% targeted uptime. Privileged administrative actions, role modifications, and status changes are permanently recorded in an append-only audit ledger for compliance, forensic review, and statutory transparency.
          </p>
        </section>

        <section className="space-y-4 text-slate-300 text-sm leading-relaxed">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-indigo-400" /> 6. Limitation of Liability & Termination
          </h2>
          <p>
            To the maximum extent permitted by applicable law, DwellSync shall not be liable for indirect, incidental, or consequential damages resulting from downtime, network disruptions, or disputes between residents and society committees. Either party may terminate the subscription agreement with 30 days written notice, upon which full data export capabilities will be provided.
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

