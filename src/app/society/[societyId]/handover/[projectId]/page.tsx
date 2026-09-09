import React from "react";
import { requireSocietyAccess } from "@/lib/auth/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { roleHasPermission } from "@/lib/auth/permissions";
import { redirect, notFound } from "next/navigation";
import { HandoverDetailClient } from "./HandoverDetailClient";

export const dynamic = "force-dynamic";

export default async function HandoverProjectDetailPage({
  params,
}: {
  params: Promise<{ societyId: string; projectId: string }>;
}) {
  const { societyId, projectId } = await params;
  const { identity } = await requireSocietyAccess(societyId);

  if (!roleHasPermission(identity.currentRole, "handover.view")) {
    redirect("/unauthorized");
  }

  const adminClient = createAdminClient();

  // Fetch project — tenant-safe
  const { data: project, error } = await adminClient
    .from("handover_projects")
    .select(
      `*, creator:profiles!handover_projects_created_by_fkey(id,full_name,display_name)`
    )
    .eq("id", projectId)
    .eq("society_id", societyId)
    .single();

  if (error || !project) {
    notFound();
  }

  // Fetch all child entities in parallel for the initial page render
  const [
    checklistResult,
    defectsResult,
    commitmentsResult,
    statutoryResult,
    assetsResult,
    amcResult,
    metersResult,
    docLinksResult,
    meetingLinksResult,
  ] = await Promise.all([
    adminClient
      .from("handover_checklist_items")
      .select("*")
      .eq("handover_project_id", projectId)
      .eq("society_id", societyId)
      .order("created_at", { ascending: true }),
    adminClient
      .from("handover_defects")
      .select(`*, assignee:profiles!handover_defects_assigned_to_fkey(id,full_name,display_name)`)
      .eq("handover_project_id", projectId)
      .eq("society_id", societyId)
      .order("created_at", { ascending: false }),
    adminClient
      .from("handover_commitments")
      .select("*")
      .eq("handover_project_id", projectId)
      .eq("society_id", societyId)
      .order("created_at", { ascending: false }),
    adminClient
      .from("handover_statutory_records")
      .select("*")
      .eq("handover_project_id", projectId)
      .eq("society_id", societyId)
      .order("created_at", { ascending: false }),
    adminClient
      .from("handover_assets")
      .select("*")
      .eq("handover_project_id", projectId)
      .eq("society_id", societyId)
      .order("created_at", { ascending: false }),
    adminClient
      .from("handover_amc_warranties")
      .select("*")
      .eq("handover_project_id", projectId)
      .eq("society_id", societyId)
      .order("end_date", { ascending: true, nullsFirst: false }),
    adminClient
      .from("handover_meters")
      .select("*")
      .eq("handover_project_id", projectId)
      .eq("society_id", societyId)
      .order("meter_type", { ascending: true }),
    adminClient
      .from("handover_document_links")
      .select(`*, document:documents(id,title,file_url,file_type,category)`)
      .eq("handover_project_id", projectId)
      .eq("society_id", societyId)
      .order("created_at", { ascending: false }),
    adminClient
      .from("handover_meeting_links")
      .select(`*, meeting:society_meetings(id,title,scheduled_at,status,meeting_type)`)
      .eq("handover_project_id", projectId)
      .eq("society_id", societyId)
      .order("created_at", { ascending: false }),
  ]);

  // Fetch staff members for defect assignment
  const { data: staffMembers } = await adminClient
    .from("society_memberships")
    .select(`user_id, role_id, user:profiles(id,full_name,display_name)`)
    .eq("society_id", societyId)
    .eq("status", "ACTIVE")
    .in("role_id", ["SOCIETY_ADMIN", "SECRETARY", "COMMITTEE_MEMBER", "MANAGER", "STAFF"]);

  const canManage = roleHasPermission(identity.currentRole, "handover.manage");
  const canApprove = roleHasPermission(identity.currentRole, "handover.approve");

  return (
    <div className="max-w-7xl mx-auto">
      <HandoverDetailClient
        project={project}
        checklistItems={checklistResult.data || []}
        defects={defectsResult.data || []}
        commitments={commitmentsResult.data || []}
        statutoryRecords={statutoryResult.data || []}
        assets={assetsResult.data || []}
        amcWarranties={amcResult.data || []}
        meters={metersResult.data || []}
        documentLinks={docLinksResult.data || []}
        meetingLinks={meetingLinksResult.data || []}
        staffMembers={(staffMembers || []).map((sm: any) => ({
          ...sm.user,
          role_id: sm.role_id,
        }))}
        societyId={societyId}
        currentUserId={identity.effectiveUser.id}
        canManage={canManage}
        canApprove={canApprove}
      />
    </div>
  );
}
