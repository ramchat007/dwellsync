import { NextResponse } from "next/server";
import { getCurrentIdentity } from "@/lib/auth/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { recordAuditLog } from "@/lib/auth/audit";

export async function POST(req: Request) {
  try {
    const identity = await getCurrentIdentity();
    const body = await req.json();
    const { societyName, unitNumber, notes } = body;

    const adminClient = createAdminClient();

    await recordAuditLog({
      actorUserId: identity?.effectiveUser.id,
      action: "MEMBERSHIP_CREATED" as any,
      resourceType: "access_requests",
      metadata: {
        societyName,
        unitNumber,
        notes,
        requested_at: new Date().toISOString(),
      },
    });

    return NextResponse.json({
      success: true,
      message: "Access request registered. Your society administrator will review and link your account.",
    });
  } catch (err: any) {
    return NextResponse.json({ error: "Failed to submit request." }, { status: 500 });
  }
}

