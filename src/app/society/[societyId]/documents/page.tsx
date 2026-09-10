import React from "react";
import { redirect } from "next/navigation";
import { requireSocietyAccess, roleHasPermission } from "@/lib/auth/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { calculateDocumentDashboardKPIs } from "@/lib/services/documentService";
import { DocumentsAdminClient } from "./DocumentsAdminClient";

export const dynamic = "force-dynamic";

export default async function SocietyDocumentsPage({
  params,
}: {
  params: Promise<{ societyId: string }>;
}) {
  const { societyId } = await params;
  const { identity } = await requireSocietyAccess(societyId);

  if (!roleHasPermission(identity.currentRole, PERMISSIONS.DOCUMENTS_VIEW)) {
    redirect("/unauthorized");
  }

  const adminClient = createAdminClient();

  // Parallel fetch initial documents, folders, KPIs, and society units for linking
  const [docsResult, foldersResult, kpis, unitsResult] = await Promise.all([
    adminClient
      .from("documents")
      .select(`
        *,
        uploader:profiles!uploaded_by (id, full_name, display_name),
        folder:document_folders!folder_id (id, name, color, icon)
      `)
      .eq("society_id", societyId)
      .eq("is_archived", false)
      .neq("status", "ARCHIVED")
      .order("created_at", { ascending: false }),
    adminClient
      .from("document_folders")
      .select(`
        *,
        creator:profiles!created_by (id, full_name, display_name)
      `)
      .eq("society_id", societyId)
      .order("name", { ascending: true }),
    calculateDocumentDashboardKPIs(societyId),
    adminClient
      .from("units")
      .select("id, unit_number, building_id")
      .eq("society_id", societyId)
      .order("unit_number", { ascending: true })
      .limit(100),
  ]);

  const canManage = roleHasPermission(identity.currentRole, PERMISSIONS.DOCUMENTS_MANAGE);
  const canApprove = roleHasPermission(identity.currentRole, PERMISSIONS.DOCUMENTS_APPROVE);
  const canArchive = roleHasPermission(identity.currentRole, PERMISSIONS.DOCUMENTS_ARCHIVE);
  const canDelete = roleHasPermission(identity.currentRole, PERMISSIONS.DOCUMENTS_DELETE);

  return (
    <div className="space-y-6 max-w-7xl mx-auto p-4 sm:p-6">
      <DocumentsAdminClient
        initialDocuments={docsResult.data || []}
        initialFolders={foldersResult.data || []}
        kpis={kpis}
        units={unitsResult.data || []}
        societyId={societyId}
        currentUserId={identity.effectiveUser.id}
        permissions={{
          canManage,
          canApprove,
          canArchive,
          canDelete,
        }}
      />
    </div>
  );
}
