import { NextResponse } from "next/server";
import { getCurrentIdentity } from "@/lib/auth/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { recordAuditLog } from "@/lib/auth/audit";
import { sendDomainNotification } from "@/lib/services/notificationService";
import { GuardWalkInVisitorSchema } from "@/lib/validations/visitor";

const ALLOWED_GATE_ROLES = ["SECURITY", "SOCIETY_ADMIN", "SECRETARY", "MANAGER"];

export async function GET(req: Request) {
  try {
    const identity = await getCurrentIdentity();
    if (!identity || !identity.isAuthenticated) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const societyId = identity.currentSociety?.id;
    if (!societyId) {
      return NextResponse.json({ error: "No active society context" }, { status: 400 });
    }

    // Role check: Only security guards and society admins have access to the gate roster
    const isAuthorized =
      identity.isSuperAdmin ||
      (identity.currentRole && ALLOWED_GATE_ROLES.includes(identity.currentRole));

    if (!isAuthorized) {
      return NextResponse.json({ error: "Forbidden: Security clearance required." }, { status: 403 });
    }

    const adminClient = createAdminClient();

    // Query all visitors for the society with unit and host resident metadata
    const { data: visitors, error } = await adminClient
      .from("visitors")
      .select(`
        *,
        unit:units (
          id,
          unit_number,
          building:buildings (name, code),
          wing:wings (name, code),
          floor:floors (name, floor_number)
        ),
        creator:profiles!visitors_created_by_fkey (
          id,
          full_name,
          display_name
        ),
        check_in_guard:profiles!visitors_check_in_by_fkey (
          id,
          full_name
        )
      `)
      .eq("society_id", societyId)
      .order("created_at", { ascending: false })
      .limit(100);

    if (error) {
      console.warn("[Security Visitors GET] Notice:", error.message);
      return NextResponse.json({
        success: true,
        expected: [],
        checkedIn: [],
        recentHistory: [],
      });
    }

    const allVisitors = visitors || [];
    const expected = allVisitors.filter((v) => v.status === "EXPECTED");
    const checkedIn = allVisitors.filter((v) => v.status === "CHECKED_IN");
    const recentHistory = allVisitors.filter(
      (v) => v.status === "CHECKED_OUT" || v.status === "CANCELIED" || v.status === "DENIED"
    );

    return NextResponse.json({
      success: true,
      expected,
      checkedIn,
      recentHistory,
      totalCampusCount: checkedIn.length,
    });
  } catch (err) {
    console.error("[Security Visitors GET] Error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const identity = await getCurrentIdentity();
    if (!identity || !identity.isAuthenticated) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const societyId = identity.currentSociety?.id;
    if (!societyId) {
      return NextResponse.json({ error: "No active society context" }, { status: 400 });
    }

    const isAuthorized =
      identity.isSuperAdmin ||
      (identity.currentRole && ALLOWED_GATE_ROLES.includes(identity.currentRole));

    if (!isAuthorized) {
      return NextResponse.json({ error: "Forbidden: Security clearance required." }, { status: 403 });
    }

    const body = await req.json();
    const parsed = GuardWalkInVisitorSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Invalid walk-in details." },
        { status: 400 }
      );
    }

    const { unit_id, visitor_name, visitor_phone, purpose, vehicle_number, gate_number, notes } =
      parsed.data;

    const guardUserId = identity.effectiveUser.id;
    const adminClient = createAdminClient();

    // Verify unit belongs to the society
    const { data: targetUnit } = await adminClient
      .from("units")
      .select("id, unit_number")
      .eq("id", unit_id)
      .eq("society_id", societyId)
      .maybeSingle();

    if (!targetUnit) {
      return NextResponse.json(
        { error: "Target unit does not belong to this society." },
        { status: 400 }
      );
    }

    const now = new Date().toISOString();
    const pass_code = Math.floor(100000 + Math.random() * 900000).toString();

    const { data: visitor, error } = await adminClient
      .from("visitors")
      .insert({
        society_id: societyId,
        unit_id,
        created_by: guardUserId,
        visitor_name,
        visitor_phone: visitor_phone || null,
        purpose,
        vehicle_number: vehicle_number || null,
        pass_code,
        status: "CHECKED_IN",
        check_in_at: now,
        check_in_by: guardUserId,
        gate_number: gate_number || "Main Gate",
        notes: notes || null,
      })
      .select(`
        *,
        unit:units (
          id,
          unit_number,
          building:buildings (name, code),
          wing:wings (name, code)
        )
      `)
      .single();

    if (error) {
      console.error("[Security WalkIn POST] Insert error:", error);
      return NextResponse.json({ error: error.message || "Failed to log walk-in visitor." }, { status: 500 });
    }

    // Record forensic audit trail
    await recordAuditLog({
      actorUserId: identity.user.id,
      effectiveUserId: guardUserId,
      societyId,
      action: "VISITOR_CHECKED_IN",
      resourceType: "visitors",
      resourceId: visitor.id,
      metadata: {
        entry_type: "WALK_IN",
        visitor_name,
        unit_number: targetUnit.unit_number,
        gate_number: gate_number || "Main Gate",
        purpose,
      },
    });

    // Dispatch resident arrival alert via notificationService (authoritative recipient resolution)
    await sendDomainNotification({
      societyId,
      unitId: unit_id,
      type: "VISITOR_CHECKED_IN",
      category: "SECURITY",
      actorId: guardUserId,
      data: {
        visitorName: visitor_name,
        visitorId: visitor.id,
        purpose,
        unitNumber: targetUnit.unit_number,
        vehicleNumber: vehicle_number,
        gateNumber: gate_number || "Main Gate",
        checkInAt: now,
      },
      dedupKey: `visitor_checkin_${visitor.id}`,
    });

    return NextResponse.json({ success: true, visitor }, { status: 201 });
  } catch (err) {
    console.error("[Security WalkIn POST] Error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
