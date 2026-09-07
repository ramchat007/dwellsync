import { NextResponse } from "next/server";
import { requireSocietyAccess } from "@/lib/auth/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { recordAuditLog } from "@/lib/auth/audit";

export const dynamic = "force-dynamic";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ societyId: string; requestId: string }> }
) {
  try {
    const { societyId, requestId } = await params;
    const { identity } = await requireSocietyAccess(societyId);

    const body = await req.json().catch(() => ({}));
    const assignedRole = body.role || "RESIDENT"; // OWNER | TENANT | RESIDENT

    const adminClient = createAdminClient();

    // 1. Fetch access request
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
          is_fallback: true,
        };
      }
    }

    if (!request) {
      return NextResponse.json({ error: "Access request not found." }, { status: 404 });
    }

    // 2. Link Membership
    const { error: memberErr } = await adminClient
      .from("society_memberships")
      .upsert(
        {
          society_id: societyId,
          user_id: request.user_id,
          role_id: assignedRole,
          unit_number: request.unit_number,
          status: "ACTIVE",
          updated_at: new Date().toISOString(),
        },
        { onConflict: "society_id,user_id,role_id" }
      );

    if (memberErr) {
      console.error("[access-requests approve] Membership error:", memberErr);
      return NextResponse.json({ error: "Failed to create society membership." }, { status: 500 });
    }

    // 3. Resolve Unit ID if not present
    let unitId = request.unit_id;
    if (!unitId) {
      const { data: unitRecord } = await adminClient
        .from("units")
        .select("id")
        .eq("society_id", societyId)
        .eq("unit_number", request.unit_number)
        .maybeSingle();

      if (unitRecord) unitId = unitRecord.id;
    }

    // 4. Link Ownership or Occupancy
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

    // 5. Mark request as APPROVED
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

    // 6. Audit Log
    await recordAuditLog({
      actorUserId: identity.effectiveUser.id,
      societyId,
      action: "MEMBERSHIP_CREATED" as any,
      resourceType: "society_access_requests",
      resourceId: requestId,
      metadata: {
        applicantUserId: request.user_id,
        unitNumber: request.unit_number,
        assignedRole,
      },
    });

    return NextResponse.json({
      success: true,
      message: `Applicant successfully approved as ${assignedRole} for unit ${request.unit_number}.`,
    });
  } catch (err: any) {
    console.error("[access-requests approve] Exception:", err);
    return NextResponse.json({ error: "Unauthorized or server error." }, { status: 500 });
  }
}
