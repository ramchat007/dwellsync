import { NextResponse } from "next/server";
import { getCurrentIdentity } from "@/lib/auth/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { recordAuditLog } from "@/lib/auth/audit";

export async function POST(req: Request) {
  try {
    const identity = await getCurrentIdentity();
    if (!identity || !identity.isSuperAdmin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const body = await req.json();
    const { name, code, address, city, state, pincode } = body;

    if (!name || !code) {
      return NextResponse.json({ error: "Name and unique code are required" }, { status: 400 });
    }

    const adminClient = createAdminClient();

    const { data: newSociety, error } = await adminClient
      .from("societies")
      .insert({
        name,
        code: code.toUpperCase().trim(),
        address: address || null,
        city: city || null,
        state: state || null,
        pincode: pincode || null,
        status: "ACTIVE",
      })
      .select()
      .single();

    if (error) {
      console.error("[Societies API] Error creating society:", error);
      return NextResponse.json({ error: error.message || "Failed to create society" }, { status: 400 });
    }

    await recordAuditLog({
      actorUserId: identity.originalUser.id,
      societyId: newSociety.id,
      action: "SOCIETY_CREATED",
      resourceType: "societies",
      resourceId: newSociety.id,
      metadata: { name: newSociety.name, code: newSociety.code },
    });

    return NextResponse.json({ success: true, society: newSociety });
  } catch (error) {
    console.error("[Societies API] Server error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
