import { NextResponse } from "next/server";
import { requireSocietyAccess } from "@/lib/auth/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { recordAuditLog } from "@/lib/auth/audit";
import { roleHasPermission } from "@/lib/auth/permissions";
import { CreateAmcWarrantySchema } from "@/lib/validations/handover";
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
    const status = searchParams.get("status");
    const contract_type = searchParams.get("contract_type");
    let query = adminClient
      .from("handover_amc_warranties")
      .select("*")
      .eq("handover_project_id", projectId)
      .eq("society_id", societyId)
      .order("end_date", { ascending: true, nullsFirst: false });
    if (status && status !== "ALL") query = query.eq("status", status);
    if (contract_type && contract_type !== "ALL") query = query.eq("contract_type", contract_type);
    const { data: amcs, error } = await query;
    if (error) return NextResponse.json({ error: "Failed to fetch AMC/warranties" }, { status: 500 });
    return NextResponse.json({ amcs: amcs || [] });
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
    const parsed = CreateAmcWarrantySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 400 });
    }
    const adminClient = createAdminClient();
    if (!(await verifyProject(adminClient, projectId, societyId))) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }
    // Validate asset cross-tenant safety if provided
    if (parsed.data.handover_asset_id) {
      const { data: assetRow } = await adminClient
        .from("handover_assets")
        .select("id")
        .eq("id", parsed.data.handover_asset_id)
        .eq("society_id", societyId)
        .single();
      if (!assetRow) return NextResponse.json({ error: "Asset not found in this society" }, { status: 400 });
    }
    const { data: amc, error } = await adminClient
      .from("handover_amc_warranties")
      .insert({
        ...parsed.data,
        handover_project_id: projectId,
        society_id: societyId,
        created_by: identity.effectiveUser.id,
        updated_by: identity.effectiveUser.id,
      })
      .select()
      .single();
    if (error) return NextResponse.json({ error: "Failed to create AMC/warranty" }, { status: 500 });
    await recordAuditLog({
      actorUserId: identity.originalUser.id,
      effectiveUserId: identity.effectiveUser.id,
      societyId,
      action: "HANDOVER_AMC_CREATED",
      resourceType: "handover_amc_warranty",
      resourceId: amc.id,
      metadata: { title: amc.title, contract_type: amc.contract_type, project_id: projectId },
    });
    return NextResponse.json({ success: true, amc }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Internal Server Error" }, { status: 500 });
  }
}
