import React from "react";
import { redirect } from "next/navigation";
import { getCurrentIdentity } from "@/lib/auth/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { ResidentProfileClient } from "./ResidentProfileClient";

export const dynamic = "force-dynamic";

export default async function ResidentProfilePage() {
  const identity = await getCurrentIdentity();
  if (!identity || !identity.isAuthenticated) {
    redirect("/login");
  }

  const adminClient = createAdminClient();
  const userId = identity.effectiveUser.id;

  const { data: rawMemberships } = await adminClient
    .from("society_memberships")
    .select(`
      *,
      society:societies (*)
    `)
    .eq("user_id", userId)
    .eq("status", "ACTIVE");

  const memberships = rawMemberships || [];

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto">
      <ResidentProfileClient
        profile={identity.effectiveUser}
        society={identity.currentSociety}
        role={identity.currentRole || "RESIDENT"}
        memberships={memberships}
      />
    </div>
  );
}

