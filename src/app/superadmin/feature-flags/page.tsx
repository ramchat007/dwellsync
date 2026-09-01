import React from "react";
import { Flag } from "lucide-react";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function FeatureFlagsPage() {
  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Tenant Feature Flags</h1>
        <p className="text-xs text-slate-500">
          Gradual rollouts, beta features, and tenant-level feature toggles.
        </p>
      </div>

      <Card className="border-dashed border-2 border-slate-300 bg-white">
        <CardHeader className="text-center py-12">
          <div className="w-12 h-12 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto mb-3">
            <Flag className="w-6 h-6" />
          </div>
          <Badge variant="secondary" className="mx-auto font-mono text-[10px] uppercase">
            Planned Capability
          </Badge>
          <CardTitle className="text-lg font-bold text-slate-900 mt-2">
            Tenant Feature Flag Management (Planned)
          </CardTitle>
          <CardDescription className="text-xs text-slate-500 max-w-md mx-auto">
            Granular module activation (e.g. AI Meeting Assistant, Gatekeeper Biometrics, WhatsApp Bot) will be toggleable per tenant in future phases.
          </CardDescription>
        </CardHeader>
      </Card>
    </div>
  );
}
