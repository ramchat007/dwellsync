import React from "react";
import { redirect } from "next/navigation";
import { getCurrentIdentity } from "@/lib/auth/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { NoticesClient } from "./NoticesClient";

export const dynamic = "force-dynamic";

export default async function ResidentNoticesPage() {
  const identity = await getCurrentIdentity();
  if (!identity || !identity.isAuthenticated) {
    redirect("/login");
  }

  const societyId = identity.currentSociety?.id;
  const adminClient = createAdminClient();
  let notices: any[] = [];

  if (societyId) {
    const { data } = await adminClient
      .from("notices")
      .select(`
        *,
        publisher:profiles!published_by (
          id,
          full_name,
          display_name
        )
      `)
      .eq("society_id", societyId)
      .eq("status", "PUBLISHED")
      .order("published_at", { ascending: false });

    notices = data || [];
  }

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto">
      <NoticesClient
        initialNotices={notices}
        society={identity.currentSociety}
      />
    </div>
  );
}

