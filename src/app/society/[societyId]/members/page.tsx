import React from "react";
import { redirect } from "next/navigation";
import { requireSocietyAccess } from "@/lib/auth/server";
import { isAuthorizedSocietyAdmin } from "@/lib/auth/societyAdmin";
import { createAdminClient } from "@/lib/supabase/admin";
import { MembersRosterClient } from "./MembersRosterClient";

export const dynamic = "force-dynamic";

export default async function SocietyMembersPage({
  params,
}: {
  params: Promise<{ societyId: string }>;
}) {
  const { societyId } = await params;
  const { identity, society } = await requireSocietyAccess(societyId);

  // Enforce Society Admin Authorization
  if (!isAuthorizedSocietyAdmin(identity, societyId)) {
    redirect("/unauthorized");
  }

  const adminClient = createAdminClient();
  const pageSize = 25;

  const { data: initialMembers, count } = await adminClient
    .from("society_memberships")
    .select(
      `
      id,
      society_id,
      user_id,
      role_id,
      unit_number,
      status,
      created_at,
      updated_at,
      profile:profiles!user_id (
        id,
        email,
        full_name,
        display_name,
        phone,
        avatar_url
      )
    `,
      { count: "exact" }
    )
    .eq("society_id", societyId)
    .order("created_at", { ascending: false })
    .range(0, pageSize - 1);

  const total = count || 0;
  const initialPagination = {
    page: 1,
    pageSize,
    total,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  };

  return (
    <MembersRosterClient
      societyId={societyId}
      societyName={society.name}
      currentUserId={identity.effectiveUser.id}
      currentUserRole={identity.currentRole || "RESIDENT"}
      initialMembers={initialMembers || []}
      initialPagination={initialPagination}
    />
  );
}
