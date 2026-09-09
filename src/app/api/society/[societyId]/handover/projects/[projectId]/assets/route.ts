import { NextResponse } from "next/server";
import { requireSocietyAccess } from "@/lib/auth/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { recordAuditLog } from "@/lib/auth/audit";
import { roleHasPermission } from "@/lib/auth/permissions";
import { CreateAssetSchema } from "@/lib/validations/handover";
import { z } from "zod";

export const dynamic = "force-dynamic";

async function verifyProject(adminClient: any, projectId: string, societyId: string) {
  const { data } = await adminClient
    .from("handover_projects")
    .select("id")
    .eq("id", projectId)
    .eq("society_id", societyId)
    .single();
  return !!data;
}

export async function GET(
  req: Request,
  context: { params: Promise<{ societyId: string; projectId: string }> }
) {
  try {
    const { societyId, projectId } = await context.params;
    const { identity } = await requireSocietyAccess(societyId);
    if (!roleHasPermission(identity.currentRole, "handover.view")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    if (!z.string().uuid().safeParse(projectId).success) {
      return NextResponse.json({ error: "Invalid project ID" }, { status: 400 });
    }
    const adminClient = createAdminClient();
    if (!(await verifyProject(adminClient, projectId, societyId))) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }
    const { searchParams } = new URL(req.url);
    const handover_status = searchParams.get("handover_status");
    const category = searchParams.get("category");
    let query = adminClient
      .from("handover_assets")
      .select("*")
      .eq("handover_project_id", projectId)
      .eq("society_id", societyId)
      .order("created_at", { ascending: false });
    if (handover_status && handover_status !== "ALL") query = query.eq("handover_status", handover_status);
    if (category && category !== "ALL") query = query.eq("category", category);
    const { data: assets, error } = await query;
    if (error) return NextResponse.json({ error: "Failed to fetch assets" }, { status: 500 });
    return NextResponse.json({ assets: assets || [] });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(
  req: Request,
  context: { params: Promise<{ societyId: string; projectId: string }> }
) {
  try {
    const { societyId, projectId } = await context.params;
    const { identity } = await requireSocietyAccess(societyId);
    if (!roleHasPermission(identity.currentRole, "handover.manage")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    if (!z.string().uuid().safeParse(projectId).success) {
      return NextResponse.json({ error: "Invalid project ID" }, { status: 400 });
    }
    const body = await req.json();
    const parsed = CreateAssetSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 400 });
    }
    const adminClient = createAdminClient();
    if (!(await verifyProject(adminClient, projectId, societyId))) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }
    // Validate building cross-tenant safety
    if (parsed.data.building_id) {
      const { data: bldg } = await adminClient
        .from("buildings")
        .select("id")
        .eq("id", parsed.data.building_id)
        .eq("society_id", societyId)
        .single();
      if (!bldg) return NextResponse.json({ error: "Building not found in this society" }, { status: 400 });
    }
    const { data: asset, error } = await adminClient
      .from("handover_assets")
      .insert({
        ...parsed.data,
        handover_project_id: projectId,
        society_id: societyId,
        created_by: identity.effectiveUser.id,
        updated_by: identity.effectiveUser.id,
      })
      .select()
      .single();
    if (error) return NextResponse.json({ error: "Failed to create asset" }, { status: 500 });
    await recordAuditLog({
      actorUserId: identity.originalUser.id,
      effectiveUserId: identity.effectiveUser.id,
      societyId,
      action: "HANDOVER_ASSET_CREATED",
      resourceType: "handover_asset",
      resourceId: asset.id,
      metadata: { asset_name: asset.asset_name, category: asset.category, project_id: projectId },
    });
    return NextResponse.json({ success: true, asset }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Internal Server Error" }, { status: 500 });
  }
}
