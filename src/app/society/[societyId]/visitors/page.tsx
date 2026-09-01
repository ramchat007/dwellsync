import React from "react";
import { DoorOpen } from "lucide-react";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function SocietyVisitorsPage() {
  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Visitor & Gate Security</h1>
        <p className="text-xs text-slate-500">
          Guard checkpoint logging, guest pre-approvals, and delivery verification.
        </p>
      </div>

      <Card className="border-dashed border-2 border-slate-300 bg-white">
        <CardHeader className="text-center py-12">
          <div className="w-12 h-12 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto mb-3">
            <DoorOpen className="w-6 h-6" />
          </div>
          <Badge variant="secondary" className="mx-auto font-mono text-[10px] uppercase">
            Phase 1 Module
          </Badge>
          <CardTitle className="text-lg font-bold text-slate-900 mt-2">
            Visitor Management & Security (Planned)
          </CardTitle>
          <CardDescription className="text-xs text-slate-500 max-w-md mx-auto">
            Gatekeeper app, OTP approvals, delivery agent tracking, and vehicle logs will be delivered in Phase 1.
          </CardDescription>
        </CardHeader>
      </Card>
    </div>
  );
}
