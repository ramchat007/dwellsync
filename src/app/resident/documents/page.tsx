import React from "react";
import { redirect } from "next/navigation";
import { getCurrentIdentity } from "@/lib/auth/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { DocumentsClient } from "./DocumentsClient";

export const dynamic = "force-dynamic";

export default async function ResidentDocumentsPage() {
  const identity = await getCurrentIdentity();
  if (!identity || !identity.isAuthenticated) {
    redirect("/login");
  }

  const societyId = identity.currentSociety?.id;
  const adminClient = createAdminClient();
  let documents: any[] = [];

  if (societyId) {
    const role = identity.currentRole || "RESIDENT";
    const isOwnerOrAdmin = [
      "OWNER",
      "SOCIETY_ADMIN",
      "SECRETARY",
      "TREASURER",
      "COMMITTEE_MEMBER",
      "SUPER_ADMIN",
    ].includes(role);

    let query = adminClient
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

    if (!isOwnerOrAdmin) {
      query = query.eq("visibility", "ALL_RESIDENTS");
    }

    const { data } = await query;
    documents = data || [];
  }

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto">
      <DocumentsClient
        initialDocuments={documents}
        society={identity.currentSociety}
        role={identity.currentRole || "RESIDENT"}
      />
    </div>
  );
}
