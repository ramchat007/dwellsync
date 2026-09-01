import React from "react";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentIdentity } from "@/lib/auth/server";
import { UsersClient } from "./UsersClient";

export const dynamic = "force-dynamic";

export default async function SuperAdminUsersPage() {
  await getCurrentIdentity();
  const adminClient = createAdminClient();

  const { data: profiles } = await adminClient
    .from("profiles")
    .select(`
      *,
      memberships:society_memberships (
        *,
        society:societies (*)
      )
    `)
    .order("created_at", { ascending: false });

  const { data: platformAdmins } = await adminClient
    .from("platform_admins")
    .select("user_id");

  const platformAdminIds = new Set((platformAdmins || []).map((pa) => pa.user_id));

  const enrichedUsers = (profiles || []).map((p) => ({
    ...p,
    isPlatformSuperAdmin: platformAdminIds.has(p.id),
  }));

  return <UsersClient initialUsers={enrichedUsers} />;
}
