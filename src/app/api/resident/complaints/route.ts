import { NextResponse } from "next/server";
import { getCurrentIdentity } from "@/lib/auth/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { recordAuditLog } from "@/lib/auth/audit";
import { validateResidentUnitAccess } from "@/lib/auth/units";
import { CreateComplaintSchema } from "@/lib/validations/operations";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const identity = await getCurrentIdentity();
    if (!identity || !identity.isAuthenticated) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const societyId = identity.currentSociety?.id;
    if (!societyId) {
      return NextResponse.json({ complaints: [] });
    }

    const userId = identity.effectiveUser.id;
    const adminClient = createAdminClient();

    const { data: complaints, error } = await adminClient
      .from("complaints")
      .select(`
        *,
        unit:units (
          id,
          unit_number,
          building:buildings (name, code),
          wing:wings (name, code)
        ),
        creator:profiles!complaints_created_by_fkey (
          id,
          full_name,
          display_name
        ),
        assignee:profiles!complaints_assigned_to_fkey (
          id,
          full_name,
          display_name
        )
      `)
      .eq("society_id", societyId)
      .eq("created_by", userId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("[API/resident/complaints] Error fetching complaints:", error);
      return NextResponse.json({ error: "Failed to fetch complaints" }, { status: 500 });
    }

    return NextResponse.json({ complaints: complaints || [] });
  } catch (err) {
    console.error("[API/resident/complaints] Exception:", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
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

    const body = await req.json();
    const parsed = CreateComplaintSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const userId = identity.effectiveUser.id;
    const adminClient = createAdminClient();

    // Auto-resolve unit_id if not provided
    let targetUnitId = parsed.data.unit_id || null;
    if (!targetUnitId) {
      const { data: ownedUnit } = await adminClient
        .from("unit_owners")
        .select("unit_id")
        .eq("society_id", societyId)
        .eq("user_id", userId)
        .eq("status", "ACTIVE")
        .limit(1)
        .maybeSingle();

      if (ownedUnit?.unit_id) {
        targetUnitId = ownedUnit.unit_id;
      } else {
        const { data: occupiedUnit } = await adminClient
          .from("unit_occupancies")
          .select("unit_id")
          .eq("society_id", societyId)
          .eq("user_id", userId)
          .eq("status", "ACTIVE")
          .limit(1)
          .maybeSingle();

        if (occupiedUnit?.unit_id) {
          targetUnitId = occupiedUnit.unit_id;
        }
      }
    } else {
      const isAuthorized = await validateResidentUnitAccess(societyId, userId, targetUnitId);
      if (!isAuthorized) {
        return NextResponse.json(
          { error: "Unauthorized: You do not have an active relationship with this unit" },
          { status: 403 }
        );
      }
    }

    const { data: complaint, error: insertError } = await adminClient
      .from("complaints")
      .insert({
        society_id: societyId,
        unit_id: targetUnitId,
        created_by: userId,
        title: parsed.data.title,
        description: parsed.data.description,
        category: parsed.data.category,
        priority: parsed.data.priority,
        status: "SUBMITTED",
      })
      .select(`
        *,
        unit:units (
          id,
          unit_number,
          building:buildings (name, code),
          wing:wings (name, code)
        ),
        creator:profiles!complaints_created_by_fkey (
          id,
          full_name,
          display_name
        )
      `)
      .single();

    if (insertError) {
      console.error("[API/resident/complaints] Error creating complaint:", insertError);
      return NextResponse.json({ error: "Failed to create complaint" }, { status: 500 });
    }

    await recordAuditLog({
      actorUserId: identity.originalUser.id,
      effectiveUserId: userId,
      societyId,
      action: "COMPLAINT_CREATED",
      resourceType: "complaint",
      resourceId: complaint.id,
      metadata: {
        title: complaint.title,
        category: complaint.category,
        priority: complaint.priority,
        unit_id: complaint.unit_id,
      },
    });

    return NextResponse.json({ success: true, complaint });
  } catch (err) {
    console.error("[API/resident/complaints] Exception:", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
