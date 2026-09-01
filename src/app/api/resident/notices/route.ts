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
      return NextResponse.json({ notices: [] });
    }

    const adminClient = createAdminClient();

    const { data: notices, error } = await adminClient
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

    if (error) {
      console.error("[API/resident/notices] Error fetching notices:", error);
      return NextResponse.json({ error: "Failed to fetch notices." }, { status: 500 });
    }

    return NextResponse.json({ notices: notices || [] });
  } catch (err) {
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

