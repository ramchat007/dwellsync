import { NextResponse } from "next/server";
import { getCurrentIdentity } from "@/lib/auth/server";
import { isAuthorizedSocietyAdmin } from "@/lib/auth/societyAdmin";
import { createAdminClient } from "@/lib/supabase/admin";
import { recordAuditLog } from "@/lib/auth/audit";
import { sendDomainNotification } from "@/lib/services/notificationService";

export const dynamic = "force-dynamic";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ societyId: string; requestId: string }> }
) {
  try {
    const { societyId, requestId } = await params;
    const identity = await getCurrentIdentity();

    if (!identity || !identity.isAuthenticated) {
      return NextResponse.json(
        { error: "Authentication required." },
        { status: 401 }
      );
    }

    // 1. Administrative Role Enforcement: Only authorized society administrators
    if (!isAuthorizedSocietyAdmin(identity, societyId)) {
      return NextResponse.json(
        { error: "Unauthorized. Society administrative privileges required to reject access requests." },
        { status: 403 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const reason = body?.reason || "Application declined by administration.";

    const adminClient = createAdminClient();

    // 2. Fetch request to verify existence and society match
    let applicantUserId: string | null = null;
    let currentStatus: string | null = null;
    let existingNotes: string | null = null;

    const { data: existingReq } = await adminClient
      .from("society_access_requests")
      .select("user_id, status, notes")
      .eq("id", requestId)
      .eq("society_id", societyId)
      .maybeSingle();

    if (existingReq) {
      applicantUserId = existingReq.user_id;
      currentStatus = existingReq.status;
      existingNotes = existingReq.notes;
    } else {
      const { data: mem } = await adminClient
        .from("society_memberships")
        .select("user_id, status")
        .eq("id", requestId)
        .eq("society_id", societyId)
        .maybeSingle();
      if (mem) {
        applicantUserId = mem.user_id;
        currentStatus = mem.status === "INVITED" ? "PENDING" : mem.status;
      }
    }

    if (!applicantUserId) {
      return NextResponse.json({ error: "Access request not found." }, { status: 404 });
    }

    // 3. Status Validation: Cannot reject non-pending requests
    if (currentStatus !== "PENDING") {
      return NextResponse.json(
        { error: `Cannot reject request with status '${currentStatus}'. Only pending requests can be rejected.` },
        { status: 400 }
      );
    }

    // 4. Update request status to REJECTED
    const rejectionNote = existingNotes
      ? `${existingNotes} [Declined: ${reason}]`
      : `[Declined: ${reason}]`;

    const { data: updatedReq } = await adminClient
      .from("society_access_requests")
      .update({
        status: "REJECTED",
        reviewed_by: identity.effectiveUser.id,
        reviewed_at: new Date().toISOString(),
        notes: rejectionNote,
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
          updated_at: new Date().toISOString(),
        })
        .eq("id", requestId)
        .eq("society_id", societyId);
    }

    // 5. Record Audit Log
    await recordAuditLog({
      actorUserId: identity.effectiveUser.id,
      societyId,
      action: "ACCESS_REQUEST_REJECTED" as any,
      resourceType: "society_access_requests",
      resourceId: requestId,
      metadata: {
        applicantUserId,
        reason,
      },
    });

    // 6. Notification Dispatch
    if (applicantUserId) {
      try {
        await sendDomainNotification({
          societyId,
          type: "ACCESS_REQUEST_REJECTED",
          recipientIds: [applicantUserId],
          data: {
            reason,
          },
          dedupKey: `access_req_rejected_${requestId}`,
        });
      } catch (notifErr) {
        console.warn("[access-requests reject] Notification dispatch warning:", notifErr);
      }
    }

    return NextResponse.json({
      success: true,
      message: "Access request rejected.",
    });
  } catch (err: any) {
    if (err?.digest?.startsWith?.("NEXT_REDIRECT") || err?.message === "NEXT_REDIRECT") {
      return NextResponse.json({ error: "Unauthorized access to society" }, { status: 403 });
    }
    console.error("[access-requests reject] Exception:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
