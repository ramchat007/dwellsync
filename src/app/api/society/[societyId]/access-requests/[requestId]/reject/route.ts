import { NextResponse } from "next/server";
import { requireSocietyAccess } from "@/lib/auth/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ societyId: string; requestId: string }> }
) {
  try {
    const { societyId, requestId } = await params;
    const { identity } = await requireSocietyAccess(societyId);

    const adminClient = createAdminClient();

    const { data: updatedReq } = await adminClient
      .from("society_access_requests")
      .update({
        status: "REJECTED",
        reviewed_by: identity.effectiveUser.id,
        reviewed_at: new Date().toISOString(),
      })
      .eq("id", requestId)
      .eq("society_id", societyId)
      .select();

    if (!updatedReq || updatedReq.length === 0) {
      // Fallback: Check if it's in society_memberships
      await adminClient
        .from("society_memberships")
        .update({
          status: "REMOVED",
          left_at: new Date().toISOString(),
        })
        .eq("id", requestId)
        .eq("society_id", societyId);
    }

    return NextResponse.json({
      success: true,
      message: "Access request rejected.",
    });
  } catch (err: any) {
    console.error("[access-requests reject] Exception:", err);
    return NextResponse.json({ error: "Unauthorized or server error." }, { status: 500 });
  }
}
