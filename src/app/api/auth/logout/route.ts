import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getCurrentIdentity } from "@/lib/auth/server";
import { recordAuditLog } from "@/lib/auth/audit";
import { cookies } from "next/headers";
import { IMPERSONATION_COOKIE_NAME } from "@/lib/auth/impersonation";

export async function POST() {
  try {
    const identity = await getCurrentIdentity();
    const supabase = await createServerSupabaseClient();
    const cookieStore = await cookies();

    cookieStore.delete(IMPERSONATION_COOKIE_NAME);

    if (identity?.isSuperAdmin) {
      await recordAuditLog({
        actorUserId: identity.originalUser.id,
        action: "SUPER_ADMIN_LOGOUT",
        resourceType: "auth.users",
        resourceId: identity.originalUser.id,
      });
    }

    await supabase.auth.signOut();

    return NextResponse.json({ success: true, redirectUrl: "/login" });
  } catch (err) {
    console.error("[Logout API] Error:", err);
    return NextResponse.json({ error: "Failed to sign out." }, { status: 500 });
  }
}
