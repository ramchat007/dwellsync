import { NextResponse } from "next/server";
import { getCurrentIdentity } from "@/lib/auth/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const identity = await getCurrentIdentity();
    if (!identity || !identity.isAuthenticated) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const societyId = identity.currentSociety?.id;
    if (!societyId) {
      return NextResponse.json({ documents: [] });
    }

    const adminClient = createAdminClient();
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

    // Tenants only see ALL_RESIDENTS documents
    if (!isOwnerOrAdmin) {
      query = query.eq("visibility", "ALL_RESIDENTS");
    }

    const { data: documents, error } = await query;

    if (error) {
      console.error("[API/resident/documents] Error fetching documents:", error);
      return NextResponse.json({ error: "Failed to fetch documents." }, { status: 500 });
    }

    return NextResponse.json({ documents: documents || [] });
  } catch (err) {
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
