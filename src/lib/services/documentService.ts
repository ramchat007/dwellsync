import { createAdminClient } from "@/lib/supabase/admin";
import { recordAuditLog } from "@/lib/auth/audit";
import { broadcastSocietyNotification, sendDomainNotification } from "@/lib/services/notificationService";
import { DocumentDashboardKPIs, SocietyDocument } from "@/lib/types/documents";

const STORAGE_BUCKET = "society-documents";

/**
 * Uploads a file buffer directly to the tenant-isolated private Supabase Storage bucket.
 * Path pattern: {societyId}/{categoryOrFolder}/{timestamp}_{sanitizedFileName}
 */
export async function uploadDocumentFileToStorage(params: {
  societyId: string;
  fileBuffer: Buffer;
  fileName: string;
  mimeType: string;
  categoryOrFolder?: string;
}): Promise<{
  file_url: string;
  file_path: string;
  file_name: string;
  file_size_kb: number;
  file_type: string;
}> {
  const { societyId, fileBuffer, fileName, mimeType, categoryOrFolder } = params;
  const adminClient = createAdminClient();

  const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
  const folder = (categoryOrFolder || "general").toLowerCase().replace(/[^a-z0-9_-]/g, "_");
  const timestamp = Date.now();
  const filePath = `${societyId}/${folder}/${timestamp}_${sanitizedFileName}`;

  const { data, error } = await adminClient.storage
    .from(STORAGE_BUCKET)
    .upload(filePath, fileBuffer, {
      contentType: mimeType,
      upsert: true,
    });

  if (error) {
    console.error("[DocumentService:upload] Storage upload failed:", error);
    throw new Error(`Failed to upload file to storage: ${error.message}`);
  }

  // File size in KB
  const fileSizeKb = Math.ceil(fileBuffer.length / 1024);

  // For private buckets, file_url holds a storage URI reference or signed URL fallback
  const fileUrl = `/api/society/${societyId}/documents/storage/${encodeURIComponent(filePath)}`;

  return {
    file_url: fileUrl,
    file_path: filePath,
    file_name: fileName,
    file_size_kb: fileSizeKb,
    file_type: mimeType.split("/")[1]?.toUpperCase() || "FILE",
  };
}

/**
 * Generates an expiring, secure signed download URL for private documents.
 */
export async function generateDocumentSignedUrl(
  societyId: string,
  filePathOrUrl: string,
  expiresInSeconds = 300
): Promise<string> {
  const adminClient = createAdminClient();

  // If it's already an external link (http/https not pointing to our internal storage), return as is
  if (filePathOrUrl.startsWith("http://") || filePathOrUrl.startsWith("https://")) {
    // Check if it's a Supabase storage URL containing the bucket name
    if (!filePathOrUrl.includes(STORAGE_BUCKET)) {
      return filePathOrUrl;
    }
  }

  // Extract path if given internal path format
  let storagePath = filePathOrUrl;
  if (filePathOrUrl.includes(`/documents/storage/`)) {
    const parts = filePathOrUrl.split(`/documents/storage/`);
    storagePath = decodeURIComponent(parts[1] || "");
  }

  // Strip leading bucket if present
  storagePath = storagePath.replace(`${STORAGE_BUCKET}/`, "");

  const { data, error } = await adminClient.storage
    .from(STORAGE_BUCKET)
    .createSignedUrl(storagePath, expiresInSeconds);

  if (error || !data?.signedUrl) {
    console.warn("[DocumentService:signedUrl] Failed to generate signed URL, falling back to original:", error);
    return filePathOrUrl;
  }

  return data.signedUrl;
}

/**
 * Authoritative check to verify whether a user identity has rights to view/access a document.
 */
export async function checkUserDocumentAccess(
  identity: any,
  document: any,
  societyId: string
): Promise<boolean> {
  if (!identity || !identity.isAuthenticated) return false;

  // 1. Strict tenant isolation
  if (document.society_id !== societyId) return false;

  const role = identity.currentRole || "RESIDENT";

  // 2. Privileged roles have full access to view all documents
  if (
    [
      "SUPER_ADMIN",
      "SOCIETY_ADMIN",
      "SECRETARY",
      "COMMITTEE_MEMBER",
      "TREASURER",
      "MANAGER",
    ].includes(role)
  ) {
    return true;
  }

  // 3. For residents/owners: document must be published and non-archived
  if (document.status !== "PUBLISHED" || document.is_archived) {
    return false;
  }

  // 4. Personal / Unit attribution (addressed specifically to this resident or unit)
  if (document.resident_id && document.resident_id === identity.effectiveUser.id) {
    return true;
  }

  if (document.unit_id) {
    const adminClient = createAdminClient();
    const { data: owner } = await adminClient
      .from("unit_owners")
      .select("id")
      .eq("unit_id", document.unit_id)
      .eq("owner_user_id", identity.effectiveUser.id)
      .eq("status", "ACTIVE")
      .maybeSingle();

    if (owner) return true;

    const { data: occ } = await adminClient
      .from("unit_occupancies")
      .select("id")
      .eq("unit_id", document.unit_id)
      .eq("user_id", identity.effectiveUser.id)
      .is("end_date", null)
      .maybeSingle();

    if (occ) return true;
  }

  // 5. Role-based visibility
  if (document.visibility === "ALL_RESIDENTS") {
    return true;
  }

  if (document.visibility === "OWNERS_ONLY") {
    return role === "OWNER";
  }

  if (document.visibility === "ROLE_RESTRICTED") {
    const allowed = document.allowed_roles || [];
    return allowed.includes(role);
  }

  if (document.visibility === "COMMITTEE_ONLY" || document.visibility === "ADMIN_ONLY") {
    return false;
  }

  return false;
}

/**
 * Handles publishing an official document and optionally dispatching a consolidated community broadcast.
 */
export async function publishDocumentAndNotify(params: {
  societyId: string;
  documentId: string;
  actorId: string;
  publicationNotes?: string | null;
  broadcastNotification?: boolean;
}): Promise<any> {
  const { societyId, documentId, actorId, publicationNotes, broadcastNotification } = params;
  const adminClient = createAdminClient();

  const { data: document, error: fetchErr } = await adminClient
    .from("documents")
    .select("*")
    .eq("id", documentId)
    .eq("society_id", societyId)
    .single();

  if (fetchErr || !document) {
    throw new Error("Document not found");
  }

  const now = new Date().toISOString();
  const { data: updated, error: updateErr } = await adminClient
    .from("documents")
    .update({
      status: "PUBLISHED",
      is_archived: false,
      published_by: actorId,
      published_at: now,
      publication_notes: publicationNotes || null,
      updated_at: now,
    })
    .eq("id", documentId)
    .eq("society_id", societyId)
    .select()
    .single();

  if (updateErr) {
    throw new Error(`Failed to publish document: ${updateErr.message}`);
  }

  await recordAuditLog({
    actorUserId: actorId,
    effectiveUserId: actorId,
    societyId,
    action: "DOCUMENT_PUBLISHED",
    resourceType: "document",
    resourceId: documentId,
    metadata: {
      title: updated.title,
      category: updated.category,
      visibility: updated.visibility,
      notes: publicationNotes || null,
    },
  });

  // Consolidated notification dispatch: never send spam, only one structured announcement
  if (broadcastNotification && (updated.visibility === "ALL_RESIDENTS" || updated.visibility === "OWNERS_ONLY")) {
    try {
      await broadcastSocietyNotification({
        societyId,
        actorId,
        category: "NOTICES",
        type: "DOCUMENT_PUBLISHED",
        title: `Official Document Published: ${updated.title}`,
        body: `The society managing committee has published "${updated.title}" (${updated.category.replace(/_/g, " ")}) for members.`,
        actionUrl: `/resident/documents?id=${documentId}`,
        targetRole: updated.visibility === "OWNERS_ONLY" ? "OWNER" : null,
      });
    } catch (notifErr) {
      console.error("[DocumentService:publish] Notification dispatch error:", notifErr);
    }
  }

  return updated;
}

/**
 * Computes dashboard statistics across documents for the society.
 */
export async function calculateDocumentDashboardKPIs(societyId: string): Promise<DocumentDashboardKPIs> {
  const adminClient = createAdminClient();

  const [docsResult, foldersResult] = await Promise.all([
    adminClient
      .from("documents")
      .select("id, status, is_archived, expiry_date")
      .eq("society_id", societyId),
    adminClient
      .from("document_folders")
      .select("id", { count: "exact", head: true })
      .eq("society_id", societyId),
  ]);

  const docs = docsResult.data || [];
  const now = new Date();
  const thirtyDaysLater = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

  let totalDocuments = docs.length;
  let publishedDocuments = 0;
  let underReviewDocuments = 0;
  let draftDocuments = 0;
  let archivedDocuments = 0;
  let expiringWithin30Days = 0;

  for (const doc of docs) {
    if (doc.is_archived || doc.status === "ARCHIVED") {
      archivedDocuments++;
    } else {
      if (doc.status === "PUBLISHED") publishedDocuments++;
      else if (doc.status === "UNDER_REVIEW") underReviewDocuments++;
      else if (doc.status === "DRAFT") draftDocuments++;

      if (doc.expiry_date) {
        const exp = new Date(doc.expiry_date);
        if (exp >= now && exp <= thirtyDaysLater) {
          expiringWithin30Days++;
        }
      }
    }
  }

  return {
    totalDocuments,
    publishedDocuments,
    underReviewDocuments,
    draftDocuments,
    archivedDocuments,
    expiringWithin30Days,
    totalFolders: foldersResult.count || 0,
  };
}
