import { NextResponse } from "next/server";
import { getCurrentIdentity } from "@/lib/auth/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { recordAuditLog } from "@/lib/auth/audit";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const identity = await getCurrentIdentity();
    if (!identity || !identity.isAuthenticated) {
      return NextResponse.json(
        { error: "Please log in to cancel your access request." },
        { status: 401 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const { requestId } = body;

    if (!requestId || typeof requestId !== "string") {
      return NextResponse.json(
        { error: "Request ID is required." },
        { status: 400 }
      );
    }

    const adminClient = createAdminClient();

    // 1. Fetch access request
    const { data: request, error: fetchErr } = await adminClient
      .from("society_access_requests")
      .select("*")
      .eq("id", requestId)
      .maybeSingle();

    if (fetchErr || !request) {
      return NextResponse.json(
        { error: "Access request not found." },
        { status: 404 }
      );
    }

    // 2. Ownership Verification: Only the requester can cancel their own request
    if (request.user_id !== identity.effectiveUser.id) {
      return NextResponse.json(
        { error: "You are not authorized to cancel this access request." },
        { status: 403 }
      );
    }

    // 3. Status Eligibility: Only PENDING requests can be cancelled
    if (request.status !== "PENDING") {
      return NextResponse.json(
        { error: `Cannot cancel request in '${request.status}' status. Only pending requests can be cancelled.` },
        { status: 400 }
      );
    }

    // 4. Update Status natively to CANCELLED
    const updateResult = await adminClient
      .from("society_access_requests")
      .update({
        status: "CANCELLED",
        reviewed_at: new Date().toISOString(),
        notes: request.notes ? `${request.notes} [Cancelled by applicant]` : "[Cancelled by applicant]",
      })
      .eq("id", requestId);

    if (updateResult.error) {
      console.error("[request-access/cancel] Update error:", updateResult.error);
      return NextResponse.json(
        { error: "Failed to cancel access request. Please try again." },
        { status: 500 }
      );
    }

    // 5. Record Audit Log
    await recordAuditLog({
      actorUserId: identity.effectiveUser.id,
      societyId: request.society_id,
      action: "ACCESS_REQUEST_CANCELLED" as any,
      resourceType: "society_access_requests",
      resourceId: requestId,
      metadata: {
        cancelledBy: identity.effectiveUser.id,
        unitNumber: request.unit_number,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Access request successfully cancelled.",
    });
  } catch (err: any) {
    console.error("[request-access/cancel] Exception:", err);
    return NextResponse.json(
      { error: "Internal server error." },
      { status: 500 }
    );
  }
}
