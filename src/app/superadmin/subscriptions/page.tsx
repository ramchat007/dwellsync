import React from "react";
import { CreditCard } from "lucide-react";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function SubscriptionsPage() {
  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Subscription & Billing Management</h1>
        <p className="text-xs text-slate-500">
          Tenant subscription tiers, invoice cycles, and payment gateways.
        </p>
      </div>

      <Card className="border-dashed border-2 border-slate-300 bg-white">
        <CardHeader className="text-center py-12">
          <div className="w-12 h-12 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto mb-3">
            <CreditCard className="w-6 h-6" />
          </div>
          <Badge variant="secondary" className="mx-auto font-mono text-[10px] uppercase">
            Phase 1 Module
          </Badge>
          <CardTitle className="text-lg font-bold text-slate-900 mt-2">
            Subscription Engine (Planned)
          </CardTitle>
          <CardDescription className="text-xs text-slate-500 max-w-md mx-auto">
            Society subscription tiers (FREE, STANDARD, PRO, ENTERPRISE), automated SaaS billing, and payment gateways will be implemented in subsequent phases.
          </CardDescription>
        </CardHeader>
      </Card>
    </div>
  );
}
