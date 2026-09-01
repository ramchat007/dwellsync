import { NextResponse } from "next/server";
import { getCurrentIdentity } from "@/lib/auth/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { recordAuditLog } from "@/lib/auth/audit";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const identity = await getCurrentIdentity();
    if (!identity || !identity.isAuthenticated) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const societyId = identity.currentSociety?.id;
    if (!societyId) {
      return NextResponse.json({ familyMembers: [] });
    }

    const adminClient = createAdminClient();

    // Fetch family members belonging to the effective user in this society
    const { data: familyMembers, error } = await adminClient
      .from("family_members")
      .select(`
        *,
        unit:units (
          id,
          unit_number,
          building:buildings (name)
        )
      `)
      .eq("society_id", societyId)
      .eq("primary_resident_user_id", identity.effectiveUser.id)
      .order("created_at", { ascending: true });

    if (error) {
      console.error("[API/resident/family] Query error:", error);
      return NextResponse.json({ error: "Failed to fetch family members." }, { status: 500 });
    }

    return NextResponse.json({ familyMembers: familyMembers || [] });
  } catch (err: any) {
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
      return NextResponse.json({ error: "No active society context found." }, { status: 400 });
    }

    const body = await req.json();
    const { full_name, relationship, phone, email, is_minor, gate_access_allowed, unit_id } = body;

    if (!full_name || !relationship) {
      return NextResponse.json(
        { error: "Full name and relationship are required." },
        { status: 400 }
      );
    }

    const adminClient = createAdminClient();

    // If unit_id is not supplied, locate resident's first active unit
    let targetUnitId = unit_id;
    if (!targetUnitId) {
      const { data: occupancy } = await adminClient
        .from("unit_occupancies")
        .select("unit_id")
        .eq("user_id", identity.effectiveUser.id)
        .eq("society_id", societyId)
        .eq("status", "ACTIVE")
        .limit(1)
        .maybeSingle();

      if (occupancy) {
        targetUnitId = occupancy.unit_id;
      } else {
        // Check unit_ownerships
        const { data: ownership } = await adminClient
          .from("unit_ownerships")
          .select("unit_id")
          .eq("user_id", identity.effectiveUser.id)
          .eq("society_id", societyId)
          .eq("status", "ACTIVE")
          .limit(1)
          .maybeSingle();

        targetUnitId = ownership?.unit_id || null;
      }
    }

    if (!targetUnitId) {
      return NextResponse.json(
        { error: "No registered unit found for this resident to attach family members." },
        { status: 400 }
      );
    }

    const { data: newMember, error: insertError } = await adminClient
      .from("family_members")
      .insert({
        society_id: societyId,
        unit_id: targetUnitId,
        primary_resident_user_id: identity.effectiveUser.id,
        full_name,
        relationship,
        phone: phone || null,
        email: email || null,
        is_minor: !!is_minor,
        gate_access_allowed: gate_access_allowed !== false,
      })
      .select()
      .single();

    if (insertError || !newMember) {
      console.error("[API/resident/family] Insert error:", insertError);
      return NextResponse.json({ error: "Failed to add family member." }, { status: 500 });
    }

    await recordAuditLog({
      actorUserId: identity.effectiveUser.id,
      societyId,
      action: "FAMILY_MEMBER_CREATED" as any,
      resourceType: "family_members",
      resourceId: newMember.id,
      metadata: { full_name, relationship },
    });

    return NextResponse.json({ success: true, member: newMember });
  } catch (err: any) {
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const identity = await getCurrentIdentity();
    if (!identity || !identity.isAuthenticated) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const memberId = searchParams.get("id");

    if (!memberId) {
      return NextResponse.json({ error: "Member ID is required." }, { status: 400 });
    }

    const adminClient = createAdminClient();

    // Verify ownership
    const { data: member } = await adminClient
      .from("family_members")
      .select("*")
      .eq("id", memberId)
      .eq("primary_resident_user_id", identity.effectiveUser.id)
      .maybeSingle();

    if (!member && !identity.isSuperAdmin) {
      return NextResponse.json({ error: "Family member record not found or access denied." }, { status: 404 });
    }

    await adminClient.from("family_members").delete().eq("id", memberId);

    await recordAuditLog({
      actorUserId: identity.effectiveUser.id,
      societyId: member?.society_id || identity.currentSociety?.id,
      action: "FAMILY_MEMBER_REMOVED" as any,
      resourceType: "family_members",
      resourceId: memberId,
    });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

