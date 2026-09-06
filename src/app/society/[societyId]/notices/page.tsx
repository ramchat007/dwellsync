import React from "react";
import { requireSocietyAccess } from "@/lib/auth/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { NoticesAdminClient } from "./NoticesAdminClient";

export const dynamic = "force-dynamic";

export default async function SocietyNoticesPage({
  params,
}: {
  params: Promise<{ societyId: string }>;
}) {
  const { societyId } = await params;
  await requireSocietyAccess(societyId);

  const adminClient = createAdminClient();

  const { data: notices } = await adminClient
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
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <NoticesAdminClient
        initialNotices={notices || []}
        societyId={societyId}
      />
    </div>
  );
}
