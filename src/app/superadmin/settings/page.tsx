import React from "react";
import { Shield, Lock } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function PlatformSettingsPage() {
  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Platform Settings</h1>
        <p className="text-xs text-slate-500">
          Global platform parameters, security policies, and environment config.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Shield className="w-4 h-4 text-indigo-600" />
              Platform Security Thresholds
            </CardTitle>
            <CardDescription className="text-xs">
              Configure session duration and impersonation limits.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-xs">
            <div className="flex items-center justify-between py-1.5 border-b border-slate-100">
              <span className="text-slate-600">Max Impersonation Duration</span>
              <span className="font-mono font-semibold text-slate-900">4 Hours</span>
            </div>
            <div className="flex items-center justify-between py-1.5 border-b border-slate-100">
              <span className="text-slate-600">Impersonation Anti-Chaining</span>
              <span className="font-mono font-semibold text-emerald-600">Hard Blocked</span>
            </div>
            <div className="flex items-center justify-between py-1.5">
              <span className="text-slate-600">Password Storage Policy</span>
              <span className="font-mono font-semibold text-slate-900">Supabase Auth (Argon2/Bcrypt)</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Lock className="w-4 h-4 text-emerald-600" />
              Bootstrap Credentials Policy
            </CardTitle>
            <CardDescription className="text-xs">
              Super Admin setup rules and environment configuration.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-xs">
            <div className="flex items-center justify-between py-1.5 border-b border-slate-100">
              <span className="text-slate-600">Bootstrap Method</span>
              <span className="font-mono font-semibold text-indigo-600">CLI / Server Script Only</span>
            </div>
            <div className="flex items-center justify-between py-1.5 border-b border-slate-100">
              <span className="text-slate-600">Public Super Admin Signup</span>
              <span className="font-mono font-semibold text-red-600">Disabled / Disallowed</span>
            </div>
            <div className="flex items-center justify-between py-1.5">
              <span className="text-slate-600">Audit Trail Integrity</span>
              <span className="font-mono font-semibold text-slate-900">Immutable / Append-Only</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
