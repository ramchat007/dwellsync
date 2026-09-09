import React from "react";
import { requireSocietyAccess } from "@/lib/auth/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { roleHasPermission } from "@/lib/auth/permissions";
import { redirect } from "next/navigation";
import { HandoverListClient } from "./HandoverListClient";

export const dynamic = "force-dynamic";

export default async function HandoverPage({
  params,
}: {
  params: Promise<{ societyId: string }>;
}) {
  const { societyId } = await params;
  const { identity } = await requireSocietyAccess(societyId);

  if (!roleHasPermission(identity.currentRole, "handover.view")) {
    redirect("/unauthorized");
  }

  const adminClient = createAdminClient();

  // Fetch all handover projects for this society
  const { data: projects } = await adminClient
    .from("handover_projects")
    .select(
      `*,
      creator:profiles!handover_projects_created_by_fkey (id, full_name, display_name)`
    )
    .eq("society_id", societyId)
    .order("created_at", { ascending: false });

  // Dashboard KPIs: aggregate across all projects for this society
  const [checklistStats, defectStats, commitmentStats, amcStats] = await Promise.all([
    adminClient
      .from("handover_checklist_items")
      .select("status, priority, due_date")
      .eq("society_id", societyId),
    adminClient
      .from("handover_defects")
      .select("status, severity")
      .eq("society_id", societyId),
    adminClient
      .from("handover_commitments")
      .select("status, target_date")
      .eq("society_id", societyId),
    adminClient
      .from("handover_amc_warranties")
      .select("status, end_date")
      .eq("society_id", societyId),
  ]);

  const today = new Date().toISOString().split("T")[0];
  const thirtyDaysLater = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
    .toISOString()
    .split("T")[0];

  const kpis = {
    totalProjects: projects?.length || 0,
    activeProjects: projects?.filter((p) =>
      ["IN_PROGRESS", "UNDER_REVIEW", "READY_FOR_HANDOVER"].includes(p.status)
    ).length || 0,
    overdueChecklistItems:
      checklistStats.data?.filter(
        (c) =>
          c.due_date &&
          c.due_date < today &&
          !["COMPLETED", "NOT_APPLICABLE"].includes(c.status)
      ).length || 0,
    openCriticalDefects:
      defectStats.data?.filter(
        (d) => d.severity === "CRITICAL" && !["VERIFIED", "CLOSED"].includes(d.status)
      ).length || 0,
    pendingCommitments:
      commitmentStats.data?.filter((c) => ["PENDING", "IN_PROGRESS"].includes(c.status)).length ||
      0,
    overdueCommitments:
      commitmentStats.data?.filter(
        (c) => c.target_date && c.target_date < today && !["COMPLETED", "WAIVED"].includes(c.status)
      ).length || 0,
    expiringAmcs:
      amcStats.data?.filter(
        (a) => a.end_date && a.end_date >= today && a.end_date <= thirtyDaysLater && a.status === "ACTIVE"
      ).length || 0,
  };

  const canManage = roleHasPermission(identity.currentRole, "handover.manage");

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <HandoverListClient
        projects={projects || []}
        kpis={kpis}
        societyId={societyId}
        canManage={canManage}
      />
    </div>
  );
}
