import { NextResponse } from "next/server";
import { requireSocietyAccess } from "@/lib/auth/server";
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
    const { identity } = await requireSocietyAccess(societyId);

    const body = await req.json().catch(() => ({}));
    const reason = body?.reason || "Application declined by administration.";

    const adminClient = createAdminClient();

    // 1. Fetch request to identify applicant
    let applicantUserId: string | null = null;
    const { data: existingReq } = await adminClient
      .from("society_access_requests")
      .select("user_id")
      .eq("id", requestId)
      .eq("society_id", societyId)
      .maybeSingle();

    if (existingReq) {
      applicantUserId = existingReq.user_id;
    } else {
      const { data: mem } = await adminClient
        .from("society_memberships")
        .select("user_id")
        .eq("id", requestId)
        .eq("society_id", societyId)
        .maybeSingle();
      if (mem) applicantUserId = mem.user_id;
    }

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

    // 2. Audit Log
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

    // 3. Notification Dispatch
    if (applicantUserId) {
      try {
        await sendDomainNotification({
          societyId,
          type: "ACCESS_REQUEST_REJECTED",
          recipientIds: [applicantUserId],
          data: {
            reason,
          },
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
    console.error("[access-requests reject] Exception:", err);
    return NextResponse.json({ error: "Unauthorized or server error." }, { status: 500 });
  }
}
