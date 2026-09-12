import { NextResponse } from "next/server";
import { requireSocietyAccess } from "@/lib/auth/server";
import { createAdminClient } from "@/lib/supabase/admin";

const MANAGEMENT_ROLES = ["SUPER_ADMIN", "SOCIETY_ADMIN", "SECRETARY", "MANAGER", "TREASURER"];

export const dynamic = "force-dynamic";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ societyId: string }> }
) {
  try {
    const { societyId } = await params;
    const { identity } = await requireSocietyAccess(societyId);

    if (!identity.isSuperAdmin && (!identity.currentRole || !MANAGEMENT_ROLES.includes(identity.currentRole))) {
      return NextResponse.json(
        { error: "Forbidden: Only society management roles can view import history." },
        { status: 403 }
      );
    }

    const adminClient = createAdminClient();
    const { data: jobs, error } = await adminClient
      .from("import_jobs")
      .select("*, creator:profiles(full_name, email)")
      .eq("society_id", societyId)
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) {
      throw error;
    }

    return NextResponse.json({
      success: true,
      data: jobs || [],
    });
  } catch (error: any) {
    console.error("[import/history] Error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to fetch import history." },
      { status: 500 }
    );
  }
}

