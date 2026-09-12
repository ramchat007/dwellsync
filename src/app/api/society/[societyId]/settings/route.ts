import { NextRequest, NextResponse } from "next/server";
import { requireSocietyAccess } from "@/lib/auth/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { recordAuditLog } from "@/lib/auth/audit";
import { SocietySettingsSchema } from "@/lib/validations/governance";

export const dynamic = "force-dynamic";

const MANAGEMENT_ROLES = ["SUPER_ADMIN", "SOCIETY_ADMIN", "SECRETARY", "MANAGER", "TREASURER"];

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ societyId: string }> }
) {
  try {
    const { societyId } = await params;
    const { identity, society } = await requireSocietyAccess(societyId);

    const adminClient = createAdminClient();

    const { data: settings } = await adminClient
      .from("society_settings")
      .select("*")
      .eq("society_id", societyId)
      .maybeSingle();

    const defaultSettings = {
      society_id: societyId,
      financial_year_start_month: 4,
      agm_due_month: 9,
      quorum_percentage: 30.0,
      default_meeting_duration_minutes: 60,
      require_visitor_preapproval: false,
      auto_escalate_complaints: true,
      rules_and_by_laws: null,
      emergency_contacts: [],
      created_at: society.created_at,
      updated_at: society.updated_at,
    };

    return NextResponse.json({
      success: true,
      society,
      settings: settings || defaultSettings,
      canManage: (identity.currentRole ? MANAGEMENT_ROLES.includes(identity.currentRole) : false) || identity.isSuperAdmin,
    });
  } catch (err: any) {
    console.error("[society-settings GET] Exception:", err);
    return NextResponse.json({ error: "Unauthorized or server error" }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ societyId: string }> }
) {
  try {
    const { societyId } = await params;
    const { identity, society } = await requireSocietyAccess(societyId);

    if (!(identity.currentRole && MANAGEMENT_ROLES.includes(identity.currentRole)) && !identity.isSuperAdmin) {
      return NextResponse.json(
        { error: "Forbidden: Management authorization required to update society settings." },
        { status: 403 }
      );
    }

    const body = await req.json();
    const parseResult = SocietySettingsSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        { error: "Invalid society settings format", details: parseResult.error.flatten() },
        { status: 400 }
      );
    }

    const adminClient = createAdminClient();
    const now = new Date().toISOString();

    const { data: updated, error } = await adminClient
      .from("society_settings")
      .upsert(
        {
          society_id: societyId,
          ...parseResult.data,
          updated_at: now,
        },
        { onConflict: "society_id" }
      )
      .select()
      .single();

    if (error) {
      console.error("[society-settings PATCH] Upsert error:", error);
      return NextResponse.json({ error: "Failed to update society settings" }, { status: 500 });
    }

    await recordAuditLog({
      actorUserId: identity.effectiveUser.id,
      societyId,
      action: "SOCIETY_SETTINGS_UPDATED",
      resourceType: "society_settings",
      resourceId: societyId,
      metadata: {
        updated_fields: Object.keys(parseResult.data),
      },
    });

    return NextResponse.json({
      success: true,
      settings: updated,
    });
  } catch (err: any) {
    console.error("[society-settings PATCH] Exception:", err);
    return NextResponse.json({ error: "Unauthorized or server error" }, { status: 500 });
  }
}
