import { NextResponse } from "next/server";
import { getCurrentIdentity } from "@/lib/auth/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { recordAuditLog } from "@/lib/auth/audit";
import { sendDomainNotification } from "@/lib/services/notificationService";

export const dynamic = "force-dynamic";

const ALLOWED_REQUEST_ROLES = ["OWNER", "TENANT", "RESIDENT"];

/**
 * GET: Return current authenticated user's submitted access requests.
 */
export async function GET() {
  try {
    const identity = await getCurrentIdentity();
    if (!identity || !identity.isAuthenticated) {
      return NextResponse.json(
        { error: "Please log in to view your access requests." },
        { status: 401 }
      );
    }

    const adminClient = createAdminClient();
    const { data: requests, error } = await adminClient
      .from("society_access_requests")
      .select(`
        id,
        society_id,
        user_id,
        unit_id,
        unit_number,
        applicant_name,
        applicant_phone,
        applicant_email,
        requested_role,
        status,
        notes,
        reviewed_by,
        reviewed_at,
        created_at,
        updated_at,
        society:societies!society_id (
          id,
          name,
          code,
          city,
          state
        )
      `)
      .eq("user_id", identity.effectiveUser.id)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("[request-access GET] Query error:", error);
      return NextResponse.json({ error: "Failed to load access requests." }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      requests: requests || [],
    });
  } catch (err: any) {
    console.error("[request-access GET] Exception:", err);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}

/**
 * POST: Submit a new society access request.
 */
export async function POST(req: Request) {
  try {
    const identity = await getCurrentIdentity();
    if (!identity || !identity.isAuthenticated) {
      return NextResponse.json(
        { error: "Please log in before requesting society access." },
        { status: 401 }
      );
    }

    const body = await req.json().catch(() => ({}));
    let { societyId, societyName, unitId, unitNumber, requestedRole = "RESIDENT", notes } = body;

    const adminClient = createAdminClient();
    const user = identity.effectiveUser;

    // 1. Resolve societyId if only societyName provided
    if (!societyId && societyName && typeof societyName === "string") {
      const { data: matchedSociety } = await adminClient
        .from("societies")
        .select("id, name, status")
        .ilike("name", `%${societyName.trim()}%`)
        .in("status", ["ACTIVE", "ONBOARDING"])
        .limit(1)
        .maybeSingle();

      if (matchedSociety) {
        societyId = matchedSociety.id;
      }
    }

    if (!societyId) {
      return NextResponse.json(
        { error: "Society not found. Please select a registered society from the list." },
        { status: 400 }
      );
    }

    // 2. Validate Target Society exists and is active
    const { data: targetSociety } = await adminClient
      .from("societies")
      .select("id, name, code, status")
      .eq("id", societyId)
      .maybeSingle();

    if (!targetSociety || (targetSociety.status !== "ACTIVE" && targetSociety.status !== "ONBOARDING")) {
      return NextResponse.json(
        { error: "The selected society is inactive or not currently accepting access requests." },
        { status: 400 }
      );
    }

    // 3. Validate Unit Number
    if (!unitNumber || typeof unitNumber !== "string" || !unitNumber.trim()) {
      return NextResponse.json(
        { error: "Flat/Unit number is required to request connection." },
        { status: 400 }
      );
    }

    // 4. Role Restriction (Prevent Privilege Escalation)
    const upperRole = typeof requestedRole === "string" ? requestedRole.toUpperCase().trim() : "RESIDENT";
    const normalizedRole = ALLOWED_REQUEST_ROLES.includes(upperRole) ? upperRole : "RESIDENT";

    // 5. Existing Member Protection: Check if already an active member of this society
    const { data: existingMembership } = await adminClient
      .from("society_memberships")
      .select("id, status, role_id")
      .eq("society_id", societyId)
      .eq("user_id", user.id)
      .eq("status", "ACTIVE")
      .maybeSingle();

    if (existingMembership) {
      return NextResponse.json(
        { error: "You are already an active member of this society." },
        { status: 409 }
      );
    }

    // 6. Duplicate Request Protection: Check if user already has a PENDING request for this society
    const { data: existingPendingRequest } = await adminClient
      .from("society_access_requests")
      .select("id, status")
      .eq("society_id", societyId)
      .eq("user_id", user.id)
      .eq("status", "PENDING")
      .maybeSingle();

    if (existingPendingRequest) {
      return NextResponse.json(
        {
          error: "You already have a pending access request for this society. Please await administrator review or cancel your existing request.",
          existingRequestId: existingPendingRequest.id,
        },
        { status: 409 }
      );
    }

    // 7. Insert Access Request
    const { data: newRequest, error: reqError } = await adminClient
      .from("society_access_requests")
      .insert({
        society_id: societyId,
        user_id: user.id,
        unit_id: unitId || null,
        unit_number: unitNumber.trim(),
        applicant_name: user.full_name || user.display_name || "Applicant",
        applicant_phone: user.phone || null,
        applicant_email: user.email || null,
        requested_role: normalizedRole,
        status: "PENDING",
        notes: notes ? String(notes).trim().slice(0, 500) : null,
      })
      .select()
      .single();

    if (reqError || !newRequest) {
      console.error("[request-access] Insert error:", reqError);
      return NextResponse.json(
        { error: "Failed to submit access request. Please try again." },
        { status: 500 }
      );
    }

    // 8. Record Audit Log
    await recordAuditLog({
      actorUserId: user.id,
      societyId,
      action: "ACCESS_REQUEST_SUBMITTED" as any,
      resourceType: "society_access_requests",
      resourceId: newRequest.id,
      metadata: {
        unitNumber: unitNumber.trim(),
        requestedRole: normalizedRole,
        notes,
      },
    });

    // 9. Dispatch In-App Notification to Society Administrators
    try {
      const { data: adminMembers } = await adminClient
        .from("society_memberships")
        .select("user_id")
        .eq("society_id", societyId)
        .in("role_id", ["SOCIETY_ADMIN", "SECRETARY", "MANAGER"])
        .eq("status", "ACTIVE");

      const adminUserIds = (adminMembers || []).map((m: any) => m.user_id).filter(Boolean);
      if (adminUserIds.length > 0) {
        await sendDomainNotification({
          societyId,
          type: "ACCESS_REQUEST_SUBMITTED",
          recipientIds: adminUserIds,
          data: {
            userName: user.full_name || user.display_name || "Applicant",
            unitNumber: unitNumber.trim(),
          },
          dedupKey: `access_req_submitted_${newRequest.id}`,
        });
      }
    } catch (notifErr) {
      console.warn("[request-access] Notification warning:", notifErr);
    }

    return NextResponse.json({
      success: true,
      requestId: newRequest.id,
      message: "Access request dispatched. Your society administrator will review and approve your flat connection.",
    });
  } catch (err: any) {
    console.error("[request-access] Server exception:", err);
    return NextResponse.json({ error: "Failed to submit request." }, { status: 500 });
  }
}
