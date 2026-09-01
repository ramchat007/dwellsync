import { NextResponse } from "next/server";
import { getCurrentIdentity } from "@/lib/auth/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { recordAuditLog } from "@/lib/auth/audit";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const identity = await getCurrentIdentity();
    if (!identity || !identity.isSuperAdmin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { status } = await req.json();

    if (!["ACTIVE", "SUSPENDED"].includes(status)) {
      return NextResponse.json({ error: "Invalid status value" }, { status: 400 });
    }

    const adminClient = createAdminClient();

    const { data: updatedSociety, error } = await adminClient
      .from("societies")
      .update({ status })
      .eq("id", id)
      .select()
      .single();

    if (error || !updatedSociety) {
      return NextResponse.json({ error: "Failed to update society status" }, { status: 400 });
    }

    const auditAction = status === "ACTIVE" ? "SOCIETY_ACTIVATED" : "SOCIETY_SUSPENDED";

    await recordAuditLog({
      actorUserId: identity.originalUser.id,
      societyId: updatedSociety.id,
      action: auditAction,
      resourceType: "societies",
      resourceId: updatedSociety.id,
      metadata: { new_status: status },
    });

    return NextResponse.json({ success: true, society: updatedSociety });
  } catch (error) {
    console.error("[Society Status API] Server error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
