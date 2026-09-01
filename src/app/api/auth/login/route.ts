import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { recordAuditLog } from "@/lib/auth/audit";

export async function POST(req: Request) {
  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json({ error: "Email and password are required." }, { status: 400 });
    }

    const supabase = await createServerSupabaseClient();

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error || !data.user) {
      return NextResponse.json({ error: error?.message || "Invalid credentials." }, { status: 401 });
    }

    const adminClient = createAdminClient();

    const { data: platformAdmin } = await adminClient
      .from("platform_admins")
      .select("id")
      .eq("user_id", data.user.id)
      .eq("role_id", "SUPER_ADMIN")
      .maybeSingle();

    const isSuperAdmin = !!platformAdmin;

    const { data: membership } = await adminClient
      .from("society_memberships")
      .select("society_id, role_id")
      .eq("user_id", data.user.id)
      .eq("status", "ACTIVE")
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();

    if (isSuperAdmin) {
      await recordAuditLog({
        actorUserId: data.user.id,
        action: "SUPER_ADMIN_LOGIN",
        resourceType: "auth.users",
        resourceId: data.user.id,
        metadata: { email: data.user.email },
      });
    }

    let redirectUrl = "/superadmin";
    if (!isSuperAdmin && membership?.society_id) {
      redirectUrl = `/society/${membership.society_id}/dashboard`;
    } else if (!isSuperAdmin) {
      redirectUrl = "/unauthorized";
    }

    return NextResponse.json({
      success: true,
      redirectUrl,
      isSuperAdmin,
      societyId: membership?.society_id || null,
      role: membership?.role_id || (isSuperAdmin ? "SUPER_ADMIN" : null),
    });
  } catch (err) {
    console.error("[Login API] Error:", err);
    return NextResponse.json({ error: "Internal server error during login." }, { status: 500 });
  }
}
