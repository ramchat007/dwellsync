import { NextResponse } from "next/server";
import { getCurrentIdentity } from "@/lib/auth/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { generateDocumentSignedUrl } from "@/lib/services/documentService";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const identity = await getCurrentIdentity();
    if (!identity || !identity.isAuthenticated) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const societyId = identity.currentSociety?.id;
    if (!societyId) {
      return NextResponse.json({ documents: [] });
    }

    const { searchParams } = new URL(req.url);
    const category = searchParams.get("category");
    const search = searchParams.get("search");

    const adminClient = createAdminClient();
    const role = identity.currentRole || "RESIDENT";
    const isOwner = role === "OWNER";

    // 1. Fetch user units (owned or occupied)
    const [ownersResult, occResult] = await Promise.all([
      adminClient
        .from("unit_owners")
        .select("unit_id")
        .eq("owner_user_id", identity.effectiveUser.id)
        .eq("status", "ACTIVE"),
      adminClient
        .from("unit_occupancies")
        .select("unit_id")
        .eq("user_id", identity.effectiveUser.id)
        .is("end_date", null),
    ]);

    const userUnitIds = [
      ...(ownersResult.data || []).map((o: any) => o.unit_id),
      ...(occResult.data || []).map((o: any) => o.unit_id),
    ].filter(Boolean);

    // 2. Query documents: strictly published, not archived
    let query = adminClient
      .from("documents")
      .select(`
        *,
        uploader:profiles!uploaded_by (id, full_name, display_name),
        folder:document_folders!folder_id (id, name, color, icon)
      `)
      .eq("society_id", societyId)
      .eq("status", "PUBLISHED")
      .eq("is_archived", false);

    if (category && category !== "ALL") {
      query = query.eq("category", category);
    }

    if (search && search.trim()) {
      query = query.or(`title.ilike.%${search.trim()}%,description.ilike.%${search.trim()}%`);
    }

    query = query.order("created_at", { ascending: false });

    const { data: rawDocuments, error } = await query;

    if (error) {
      console.error("[API/resident/documents] Error fetching documents:", error);
      return NextResponse.json({ error: "Failed to fetch documents." }, { status: 500 });
    }

    // 3. Filter strictly based on resident visibility
    const visibleDocs = (rawDocuments || []).filter((doc: any) => {
      if (doc.visibility === "ALL_RESIDENTS") return true;
      if (doc.visibility === "OWNERS_ONLY" && isOwner) return true;
      if (doc.visibility === "ROLE_RESTRICTED" && (doc.allowed_roles || []).includes(role)) return true;
      if (doc.resident_id === identity.effectiveUser.id) return true;
      if (doc.unit_id && userUnitIds.includes(doc.unit_id)) return true;
      return false;
    });

    // 4. Generate signed URLs for private storage paths
    const documentsWithSignedUrls = await Promise.all(
      visibleDocs.map(async (doc: any) => {
        let signedUrl = doc.file_url;
        if (doc.file_path || doc.file_url.includes("society-documents") || doc.file_url.includes("/documents/storage/")) {
          try {
            signedUrl = await generateDocumentSignedUrl(societyId, doc.file_path || doc.file_url, 3600);
          } catch (e) {
            // fallback to original
          }
        }
        return {
          ...doc,
          file_url: signedUrl,
        };
      })
    );

    return NextResponse.json({ documents: documentsWithSignedUrls });
  } catch (err) {
    console.error("[API/resident/documents] Exception:", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
