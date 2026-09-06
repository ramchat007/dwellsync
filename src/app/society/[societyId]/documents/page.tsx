import React from "react";
import { requireSocietyAccess } from "@/lib/auth/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { DocumentsAdminClient } from "./DocumentsAdminClient";

export const dynamic = "force-dynamic";

export default async function SocietyDocumentsPage({
  params,
}: {
  params: Promise<{ societyId: string }>;
}) {
  const { societyId } = await params;
  await requireSocietyAccess(societyId);

  const adminClient = createAdminClient();

  const { data: documents } = await adminClient
    .from("documents")
    .select(`
      *,
      uploader:profiles!uploaded_by (
        id,
        full_name,
        display_name
      )
    `)
    .eq("society_id", societyId)
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <DocumentsAdminClient
        initialDocuments={documents || []}
        societyId={societyId}
      />
    </div>
  );
}
