import { NextResponse } from "next/server";
import { requireSocietyAccess } from "@/lib/auth/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export async function GET(
  req: Request,
  context: { params: Promise<{ societyId: string; complaintId: string }> }
) {
  try {
    const { societyId, complaintId } = await context.params;
    await requireSocietyAccess(societyId);

    const adminClient = createAdminClient();

    const { data: events, error } = await adminClient
      .from("complaint_sla_events")
      .select(`
        *,
        actor:profiles!complaint_sla_events_actor_id_fkey (
          id,
          full_name,
          display_name,
          email
        )
      `)
      .eq("society_id", societyId)
      .eq("complaint_id", complaintId)
      .order("created_at", { ascending: true });

    if (error) {
      console.error("[API/complaints/timeline] Error fetching timeline:", error);
      return NextResponse.json({ error: "Failed to fetch timeline" }, { status: 500 });
    }

    return NextResponse.json({ timeline: events || [] });
  } catch (err: any) {
    console.error("[API/complaints/timeline GET]", err);
    return NextResponse.json({ error: err?.message || "Internal Server Error" }, { status: 500 });
  }
}

