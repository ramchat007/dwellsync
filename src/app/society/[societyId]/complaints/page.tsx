import React from "react";
import { requireSocietyAccess } from "@/lib/auth/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { ComplaintsAdminClient } from "./ComplaintsAdminClient";

export const dynamic = "force-dynamic";

export default async function SocietyComplaintsPage({
  params,
}: {
  params: Promise<{ societyId: string }>;
}) {
  const { societyId } = await params;
  const { identity } = await requireSocietyAccess(societyId);

  const adminClient = createAdminClient();

  // 1. Fetch complaints for society
  const { data: complaints } = await adminClient
    .from("complaints")
    .select(`
      *,
      unit:units (
        id,
        unit_number,
        building:buildings (name, code),
        wing:wings (name, code)
      ),
      creator:profiles!complaints_created_by_fkey (
        id,
        full_name,
        display_name,
        email,
        phone
      ),
      assignee:profiles!complaints_assigned_to_fkey (
        id,
        full_name,
        display_name,
        email
      )
    `)
    .eq("society_id", societyId)
    .order("created_at", { ascending: false });

  // 2. Fetch staff & managers for assignment
  const { data: staffMembers } = await adminClient
    .from("society_memberships")
    .select(`
      user_id,
      role_id,
      user:profiles (
        id,
        full_name,
        display_name,
        email
      )
    `)
    .eq("society_id", societyId)
    .eq("status", "ACTIVE")
    .in("role_id", ["STAFF", "MANAGER", "SOCIETY_ADMIN", "SECRETARY", "COMMITTEE_MEMBER"]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <ComplaintsAdminClient
        initialComplaints={complaints || []}
        staffMembers={(staffMembers || []).map((sm: any) => ({
          ...sm.user,
          role_id: sm.role_id,
        }))}
        societyId={societyId}
        currentUserId={identity.effectiveUser.id}
      />
    </div>
  );
}
