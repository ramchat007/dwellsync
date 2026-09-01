import { NextResponse } from "next/server";
import { requireSocietyAccess } from "@/lib/auth/server";
import { getSocietyMembers, assignMembership } from "@/lib/services/membershipService";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ societyId: string }> }
) {
  try {
    const { societyId } = await params;
    await requireSocietyAccess(societyId);

    const members = await getSocietyMembers(societyId);
    return NextResponse.json({ success: true, data: members });
  } catch (error) {
    console.error("[members GET] Error:", error);
    return NextResponse.json({ error: "Failed to fetch members" }, { status: 500 });
  }
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ societyId: string }> }
) {
  try {
    const { societyId } = await params;
    const { identity } = await requireSocietyAccess(societyId);

    const body = await req.json();
    const { email, full_name, role_id, unit_number } = body;

    if (!email || !role_id) {
      return NextResponse.json({ error: "Email and Role are required" }, { status: 400 });
    }

    if (role_id === "SUPER_ADMIN") {
      return NextResponse.json({ error: "Cannot assign SUPER_ADMIN platform role" }, { status: 403 });
    }

    const adminClient = createAdminClient();

    // 1. Find or create user
    const { data: existingUsers } = await adminClient.auth.admin.listUsers();
    let targetUserId = (existingUsers?.users || []).find(
      (u) => u.email?.toLowerCase() === email.toLowerCase()
    )?.id;

    if (!targetUserId) {
      const { data: newUser, error: createError } = await adminClient.auth.admin.createUser({
        email,
        password: "TestPassword@123",
        email_confirm: true,
        user_metadata: { full_name: full_name || email.split("@")[0] },
      });

      if (createError || !newUser.user) {
        return NextResponse.json({ error: createError?.message || "Failed to create user" }, { status: 500 });
      }
      targetUserId = newUser.user.id;
    }

    // 2. Ensure profile exists
    await adminClient.from("profiles").upsert(
      {
        id: targetUserId,
        email,
        full_name: full_name || email.split("@")[0],
        status: "ACTIVE",
        updated_at: new Date().toISOString(),
      },
      { onConflict: "id" }
    );

    // 3. Assign membership
    const result = await assignMembership(
      {
        society_id: societyId,
        user_id: targetUserId,
        role_id,
        unit_number: unit_number || null,
        status: "ACTIVE",
      },
      identity.originalUser.id
    );

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("[members POST] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

