import React from "react";
import { redirect } from "next/navigation";
import { requireSocietyAccess } from "@/lib/auth/server";
import { isAuthorizedSocietyAdmin } from "@/lib/auth/societyAdmin";
import { createAdminClient } from "@/lib/supabase/admin";
import { AccessRequestsAdminClient } from "./AccessRequestsAdminClient";

export const dynamic = "force-dynamic";

export default async function SocietyAccessRequestsPage({
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

  const { data: requests } = await adminClient
    .from("society_access_requests")
    .select(`
      *,
      applicant:profiles!user_id (
        id,
        full_name,
        display_name,
        phone,
        email
      )
    `)
    .eq("society_id", societyId)
    .eq("status", "PENDING")
    .order("created_at", { ascending: false });

  return (
    <AccessRequestsAdminClient
      societyId={societyId}
      societyName={society.name}
      initialRequests={requests || []}
    />
  );
}
