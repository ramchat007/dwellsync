import { NextResponse } from "next/server";
import { requireSocietyAccess } from "@/lib/auth/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ societyId: string }> }
) {
  try {
    const { societyId } = await params;
    await requireSocietyAccess(societyId);

    const adminClient = createAdminClient();
    const { data: requests, error } = await adminClient
      .from("society_access_requests")
      .select(`
        *,
        applicant:profiles!user_id (
          id,
          full_name,
          display_name,
          phone,
          email
        )
      `)
      .eq("society_id", societyId)
      .eq("status", "PENDING")
      .order("created_at", { ascending: false });

    let finalRequests: any[] = requests || [];

    if (error) {
      console.warn("[access-requests GET] society_access_requests not ready, fetching INVITED members from society_memberships:", error.message);
      const { data: invitedMembers } = await adminClient
        .from("society_memberships")
        .select(`
          id,
          user_id,
          society_id,
          role_id,
          unit_number,
          status,
          created_at,
          profile:profiles!user_id (
            id,
            full_name,
            display_name,
            phone,
            email
          )
        `)
        .eq("society_id", societyId)
        .eq("status", "INVITED");

      finalRequests = (invitedMembers || []).map((m: any) => ({
        id: m.id,
        society_id: m.society_id,
        user_id: m.user_id,
        unit_number: m.unit_number || "Unassigned",
        requested_role: m.role_id,
        status: "PENDING",
        applicant_name: m.profile?.full_name || m.profile?.display_name || "Applicant",
        applicant_phone: m.profile?.phone || null,
        applicant_email: m.profile?.email || null,
        created_at: m.created_at || new Date().toISOString(),
        is_fallback: true,
      }));
    }

    return NextResponse.json({
      success: true,
      requests: finalRequests,
    });
  } catch (err: any) {
    console.error("[access-requests GET] Exception:", err);
    return NextResponse.json({ error: "Unauthorized or server error" }, { status: 500 });
  }
}
