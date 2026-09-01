import React from "react";
import { requireSocietyAccess } from "@/lib/auth/server";
import { Settings, Shield, Building2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export const dynamic = "force-dynamic";

export default async function SocietySettingsPage({
  params,
}: {
  params: Promise<{ societyId: string }>;
}) {
  const { societyId } = await params;
  const { identity, society } = await requireSocietyAccess(societyId);

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Society Settings</h1>
        <p className="text-xs text-slate-500">
          Society configurations, operational rules, and administration preferences.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Building2 className="w-4 h-4 text-indigo-600" />
              Society Identity
            </CardTitle>
            <CardDescription className="text-xs">
              Primary identification parameters for this housing society.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-xs">
            <div className="flex items-center justify-between py-1.5 border-b border-slate-100">
              <span className="text-slate-500">Society Name</span>
              <span className="font-semibold text-slate-800">{society.name}</span>
            </div>
            <div className="flex items-center justify-between py-1.5 border-b border-slate-100">
              <span className="text-slate-500">Registration Code</span>
              <span className="font-mono font-bold text-indigo-600">{society.code}</span>
            </div>
            <div className="flex items-center justify-between py-1.5">
              <span className="text-slate-500">Tenant Status</span>
              <span className="font-mono font-bold text-emerald-600">{society.status}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Shield className="w-4 h-4 text-emerald-600" />
              Role Authorization
            </CardTitle>
            <CardDescription className="text-xs">
              Current access level and privilege envelope.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-xs">
            <div className="flex items-center justify-between py-1.5 border-b border-slate-100">
              <span className="text-slate-500">Active Role</span>
              <span className="font-mono font-semibold text-slate-800">{identity.currentRole}</span>
            </div>
            <div className="flex items-center justify-between py-1.5 border-b border-slate-100">
              <span className="text-slate-500">Is Society Admin</span>
              <span className="font-mono font-semibold text-indigo-600">
                {identity.isSocietyAdmin ? "TRUE" : "FALSE"}
              </span>
            </div>
            <div className="flex items-center justify-between py-1.5">
              <span className="text-slate-500">Authorized Tenant</span>
              <span className="font-mono font-semibold text-slate-800 truncate max-w-[160px]">
                {society.id}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
