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
        { error: "Please log in before requesting society access." },
        { status: 401 }
      );
    }

    const body = await req.json();
    let { societyId, societyName, unitId, unitNumber, requestedRole = "RESIDENT", notes } = body;

    const adminClient = createAdminClient();
    const user = identity.effectiveUser;

    // 1. Resolve societyId if name provided
    if (!societyId && societyName) {
      const { data: matchedSociety } = await adminClient
        .from("societies")
        .select("id, name")
        .ilike("name", `%${societyName.trim()}%`)
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

    if (!unitNumber) {
      return NextResponse.json(
        { error: "Flat/Unit number is required to request connection." },
        { status: 400 }
      );
    }

    // 2. Insert Access Request
    const { data: newRequest, error: reqError } = await adminClient
      .from("society_access_requests")
      .insert({
        society_id: societyId,
        user_id: user.id,
        unit_id: unitId || null,
        unit_number: unitNumber.trim(),
        applicant_name: user.full_name || user.display_name || "Resident",
        applicant_phone: user.phone || null,
        applicant_email: user.email || null,
        requested_role: requestedRole,
        status: "PENDING",
        notes: notes || null,
      })
      .select()
      .single();

    let createdRequestId = "";

    if (reqError) {
      console.warn("[request-access] society_access_requests table missing/error, falling back to society_memberships INVITED:", reqError.message);
      const roleToAssign = requestedRole === "OWNER" ? "OWNER" : requestedRole === "TENANT" ? "TENANT" : "RESIDENT";
      const { data: memData, error: memError } = await adminClient
        .from("society_memberships")
        .upsert(
          {
            society_id: societyId,
            user_id: user.id,
            role_id: roleToAssign as any,
            unit_number: unitNumber.trim(),
            status: "INVITED",
            joined_at: new Date().toISOString(),
          },
          { onConflict: "society_id,user_id,role_id" }
        )
        .select()
        .single();

      if (memError || !memData) {
        console.error("[request-access] Fallback membership insert error:", memError);
        return NextResponse.json(
          { error: "Failed to submit access request. Please contact your society admin." },
          { status: 500 }
        );
      }
      createdRequestId = memData.id;
    } else {
      createdRequestId = newRequest.id;
    }

    // 3. Record Audit Log
    await recordAuditLog({
      actorUserId: user.id,
      societyId,
      action: "MEMBERSHIP_CREATED" as any,
      resourceType: "society_access_requests",
      resourceId: createdRequestId,
      metadata: {
        unitNumber,
        requestedRole,
        notes,
      },
    });

    return NextResponse.json({
      success: true,
      requestId: createdRequestId,
      message: "Access request dispatched. Your society administrator will review and approve your flat connection.",
    });
  } catch (err: any) {
    console.error("[request-access] Server exception:", err);
    return NextResponse.json({ error: "Failed to submit request." }, { status: 500 });
  }
}
