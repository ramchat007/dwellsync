import { NextResponse } from "next/server";
import { requireSocietyAccess } from "@/lib/auth/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { recordAuditLog } from "@/lib/auth/audit";
import { roleHasPermission } from "@/lib/auth/permissions";
import { ComplaintSlaConfigSchema } from "@/lib/validations/complaints";

export const dynamic = "force-dynamic";

export async function GET(
  req: Request,
  context: { params: Promise<{ societyId: string }> }
) {
  try {
    const { societyId } = await context.params;
    await requireSocietyAccess(societyId);

    const adminClient = createAdminClient();

    const { data: configs, error } = await adminClient
      .from("complaint_sla_configs")
      .select("*")
      .eq("society_id", societyId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("[API/complaints/sla-configs GET]", error);
      return NextResponse.json({ error: "Failed to fetch SLA configurations" }, { status: 500 });
    }

    return NextResponse.json({ configs: configs || [] });
  } catch (err: any) {
    console.error("[API/complaints/sla-configs GET]", err);
    return NextResponse.json({ error: err?.message || "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(
  req: Request,
  context: { params: Promise<{ societyId: string }> }
) {
  try {
    const { societyId } = await context.params;
    const { identity } = await requireSocietyAccess(societyId);

    if (!roleHasPermission(identity.currentRole, "complaints.manage")) {
      return NextResponse.json({ error: "Forbidden: requires complaints.manage permission" }, { status: 403 });
    }

    const body = await req.json();
    const parsed = ComplaintSlaConfigSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const adminClient = createAdminClient();

    const { data: config, error } = await adminClient
      .from("complaint_sla_configs")
      .upsert(
        {
          society_id: societyId,
          category: parsed.data.category,
          priority: parsed.data.priority,
          response_time_hours: parsed.data.response_time_hours,
          resolution_time_hours: parsed.data.resolution_time_hours,
          business_hours_only: parsed.data.business_hours_only,
          business_hours_start: parsed.data.business_hours_start,
          business_hours_end: parsed.data.business_hours_end,
          exclude_weekends: parsed.data.exclude_weekends,
          effective_from: parsed.data.effective_from,
          effective_to: parsed.data.effective_to || null,
          is_active: parsed.data.is_active,
          created_by: identity.effectiveUser.id,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "society_id,category,priority,effective_from" }
      )
      .select()
      .single();

    if (error) {
      console.error("[API/complaints/sla-configs POST]", error);
      return NextResponse.json({ error: "Failed to save SLA configuration" }, { status: 500 });
    }

    await recordAuditLog({
      actorUserId: identity.originalUser.id,
      effectiveUserId: identity.effectiveUser.id,
      societyId,
      action: "COMPLAINT_SLA_CONFIG_SAVED",
      resourceType: "complaint_sla_config",
      resourceId: config.id,
      metadata: parsed.data,
    });

    return NextResponse.json({ success: true, config });
  } catch (err: any) {
    console.error("[API/complaints/sla-configs POST]", err);
    return NextResponse.json({ error: err?.message || "Internal Server Error" }, { status: 500 });
  }
}

