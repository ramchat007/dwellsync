import { NextResponse } from "next/server";
import { requireSocietyAccess } from "@/lib/auth/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { recordAuditLog } from "@/lib/auth/audit";
import { sendDomainNotification } from "@/lib/services/notificationService";

export const dynamic = "force-dynamic";

const ALLOWED_MEMBER_ROLES = ["OWNER", "TENANT", "RESIDENT"];

export async function POST(
  req: Request,
  { params }: { params: Promise<{ societyId: string; requestId: string }> }
) {
  try {
    const { societyId, requestId } = await params;
    const { identity } = await requireSocietyAccess(societyId);

    // 1. Administrative Role Enforcement
    const isAuthorizedAdmin =
      identity.isSuperAdmin ||
      ["SOCIETY_ADMIN", "SECRETARY", "MANAGER"].includes(identity.currentRole || "");

    if (!isAuthorizedAdmin) {
      return NextResponse.json(
        { error: "Unauthorized. Society administrative privileges required to approve access requests." },
        { status: 403 }
      );
    }

    const adminClient = createAdminClient();

    // 2. Fetch access request
    let request: any = null;
    const { data: reqData } = await adminClient
      .from("society_access_requests")
      .select("*")
      .eq("id", requestId)
      .eq("society_id", societyId)
      .maybeSingle();

    if (reqData) {
      request = reqData;
    } else {
      // Fallback: Check if requestId is a society_membership ID with status INVITED
      const { data: memData } = await adminClient
        .from("society_memberships")
        .select("*")
        .eq("id", requestId)
        .eq("society_id", societyId)
        .maybeSingle();

      if (memData) {
        request = {
          id: memData.id,
          user_id: memData.user_id,
          unit_number: memData.unit_number,
          unit_id: null,
          requested_role: memData.role_id,
          status: memData.status === "INVITED" ? "PENDING" : memData.status,
          is_fallback: true,
        };
      }
    }

    if (!request) {
      return NextResponse.json({ error: "Access request not found." }, { status: 404 });
    }

    // 3. Self-Approval Prevention
    if (identity.effectiveUser.id === request.user_id) {
      return NextResponse.json(
        { error: "Requesters cannot approve their own access request." },
        { status: 403 }
      );
    }

    // 4. Status Validation: Only PENDING requests can be approved
    if (request.status !== "PENDING") {
      return NextResponse.json(
        { error: `Cannot approve request with status '${request.status}'. Only pending requests can be approved.` },
        { status: 400 }
      );
    }

    // 5. Role Escalation Prevention: Restrict to valid resident roles
    const body = await req.json().catch(() => ({}));
    const rawRole = body.role ? String(body.role).toUpperCase().trim() : (request.requested_role || "RESIDENT");
    const assignedRole = ALLOWED_MEMBER_ROLES.includes(rawRole) ? rawRole : "RESIDENT";

    // 6. Duplicate Membership Check
    const { data: existingActiveMember } = await adminClient
      .from("society_memberships")
      .select("id, role_id, status")
      .eq("society_id", societyId)
      .eq("user_id", request.user_id)
      .eq("status", "ACTIVE")
      .maybeSingle();

    if (existingActiveMember) {
      // User is already active in society; resolve request without duplicate membership
      if (!request.is_fallback) {
        await adminClient
          .from("society_access_requests")
          .update({
            status: "APPROVED",
            reviewed_by: identity.effectiveUser.id,
            reviewed_at: new Date().toISOString(),
          })
          .eq("id", requestId);
      }

      return NextResponse.json({
        success: true,
        message: "Applicant already holds active membership in this society.",
      });
    }

    // 7. Create/Activate Society Membership
    const { error: memberErr } = await adminClient
      .from("society_memberships")
      .upsert(
        {
          society_id: societyId,
          user_id: request.user_id,
          role_id: assignedRole as any,
          unit_number: request.unit_number,
          status: "ACTIVE",
          joined_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        { onConflict: "society_id,user_id,role_id" }
      );

    if (memberErr) {
      console.error("[access-requests approve] Membership error:", memberErr);
      return NextResponse.json({ error: "Failed to create society membership." }, { status: 500 });
    }

    // 8. Resolve Unit ID and link ownership or occupancy
    let unitId = request.unit_id;
    if (!unitId && request.unit_number) {
      const { data: unitRecord } = await adminClient
        .from("units")
        .select("id")
        .eq("society_id", societyId)
        .eq("unit_number", request.unit_number)
        .maybeSingle();

      if (unitRecord) unitId = unitRecord.id;
    }

    if (unitId) {
      if (assignedRole === "OWNER") {
        await adminClient
          .from("unit_owners")
          .upsert(
            {
              society_id: societyId,
              unit_id: unitId,
              user_id: request.user_id,
              is_primary: true,
              ownership_percentage: 100,
              ownership_type: "PRIMARY",
              status: "ACTIVE",
            },
            { onConflict: "unit_id,user_id" }
          );
      } else {
        await adminClient
          .from("unit_occupancies")
          .upsert(
            {
              society_id: societyId,
              unit_id: unitId,
              user_id: request.user_id,
              occupancy_type: assignedRole === "TENANT" ? "TENANT_OCCUPIED" : "FAMILY_OCCUPIED",
              is_primary_tenant: assignedRole === "TENANT",
              status: "ACTIVE",
            },
            { onConflict: "unit_id,user_id" }
          );
      }
    }

    // 9. Update Access Request to APPROVED
    if (!request.is_fallback) {
      await adminClient
        .from("society_access_requests")
        .update({
          status: "APPROVED",
          reviewed_by: identity.effectiveUser.id,
          reviewed_at: new Date().toISOString(),
          requested_role: assignedRole,
        })
        .eq("id", requestId);
    }

    // 10. Record Audit Log
    await recordAuditLog({
      actorUserId: identity.effectiveUser.id,
      societyId,
      action: "ACCESS_REQUEST_APPROVED" as any,
      resourceType: "society_access_requests",
      resourceId: requestId,
      metadata: {
        applicantUserId: request.user_id,
        unitNumber: request.unit_number,
        assignedRole,
      },
    });

    // 11. Dispatch Notification to Requester
    if (request.user_id) {
      try {
        await sendDomainNotification({
          societyId,
          type: "ACCESS_REQUEST_APPROVED",
          recipientIds: [request.user_id],
          data: {
            societyName: identity.currentSociety?.name || "Society",
            unitNumber: request.unit_number,
          },
          dedupKey: `access_req_approved_${requestId}`,
        });
      } catch (notifErr) {
        console.warn("[access-requests approve] Notification warning:", notifErr);
      }
    }

    return NextResponse.json({
      success: true,
      message: `Access request approved. Applicant linked as ${assignedRole}.`,
    });
  } catch (err: any) {
    if (err?.digest?.startsWith?.("NEXT_REDIRECT") || err?.message === "NEXT_REDIRECT") {
      return NextResponse.json({ error: "Unauthorized access to society" }, { status: 403 });
    }
    console.error("[access-requests approve] Exception:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
