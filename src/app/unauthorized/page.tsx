import React from "react";
import Link from "next/link";
import { ShieldX, ArrowLeft, Home } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function UnauthorizedPage() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center p-6 bg-slate-900 text-white min-h-screen">
      <div className="max-w-md w-full text-center space-y-6 p-8 rounded-2xl bg-slate-950 border border-slate-800 shadow-2xl">
        <div className="w-16 h-16 rounded-full bg-red-950/80 border border-red-800 flex items-center justify-center mx-auto text-red-400">
          <ShieldX className="w-8 h-8" />
        </div>

        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-white">Access Denied (403)</h1>
          <p className="text-sm text-slate-400 leading-relaxed">
            You do not possess the required permissions or society membership to access this protected platform area.
          </p>
        </div>

        <div className="p-3 bg-slate-900 rounded-lg border border-slate-800 text-xs text-slate-400 text-left font-mono">
          <div>Tenant Isolation: Enforced by PostgreSQL RLS</div>
          <div>Role Verification: Server-Side Evaluated</div>
        </div>

        <div className="pt-2 flex flex-col sm:flex-row gap-3 justify-center">
          <Link href="/login" className="w-full">
            <Button variant="outline" className="w-full border-slate-700 bg-slate-900 text-slate-200 hover:bg-slate-800 gap-2">
              <ArrowLeft className="w-4 h-4" /> Switch Account
            </Button>
          </Link>
          <Link href="/" className="w-full">
            <Button className="w-full bg-indigo-600 hover:bg-indigo-500 text-white gap-2">
              <Home className="w-4 h-4" /> Return Home
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
