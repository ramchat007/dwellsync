import React from "react";
import { requireSocietyAccess } from "@/lib/auth/server";
import { roleHasPermission } from "@/lib/auth/permissions";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { NewHandoverFormClient } from "./NewHandoverFormClient";

export const dynamic = "force-dynamic";

export default async function NewHandoverProjectPage({
  params,
}: {
  params: Promise<{ societyId: string }>;
}) {
  const { societyId } = await params;
  const { identity } = await requireSocietyAccess(societyId);

  if (!roleHasPermission(identity.currentRole, "handover.manage")) {
    redirect("/unauthorized");
  }

  return (
    <div className="max-w-2xl mx-auto py-8 px-4">
      <div className="mb-6">
        <Link
          href={`/society/${societyId}/handover`}
          className="text-sm text-slate-500 hover:text-slate-800"
        >
          ← Back to Handover Projects
        </Link>
        <h1 className="text-2xl font-bold text-slate-900 mt-2">New Handover Project</h1>
        <p className="text-slate-500 mt-1 text-sm">
          Create a handover workspace to manage the structured builder-to-society transition.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Project Details</CardTitle>
        </CardHeader>
        <CardContent>
          <NewHandoverForm societyId={societyId} />
        </CardContent>
      </Card>
    </div>
  );
}

function NewHandoverForm({ societyId }: { societyId: string }) {
  return <NewHandoverFormClient societyId={societyId} />;
}
