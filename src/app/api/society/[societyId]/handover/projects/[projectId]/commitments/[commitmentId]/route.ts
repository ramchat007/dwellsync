import { NextResponse } from "next/server";
import { requireSocietyAccess } from "@/lib/auth/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { recordAuditLog } from "@/lib/auth/audit";
import { roleHasPermission } from "@/lib/auth/permissions";
import { UpdateCommitmentSchema } from "@/lib/validations/handover";
import { z } from "zod";

export const dynamic = "force-dynamic";

export async function PATCH(
  req: Request,
  context: {
    params: Promise<{ societyId: string; projectId: string; commitmentId: string }>;
  }
) {
  try {
    const { societyId, projectId, commitmentId } = await context.params;
    const { identity } = await requireSocietyAccess(societyId);

    if (!roleHasPermission(identity.currentRole, "handover.manage")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    if (!z.string().uuid().safeParse(commitmentId).success) {
      return NextResponse.json({ error: "Invalid commitment ID" }, { status: 400 });
    }

    const body = await req.json();
    const parsed = UpdateCommitmentSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const adminClient = createAdminClient();
    const { data: existing } = await adminClient
      .from("handover_commitments")
      .select("*")
      .eq("id", commitmentId)
      .eq("handover_project_id", projectId)
      .eq("society_id", societyId)
      .single();

    if (!existing) {
      return NextResponse.json({ error: "Commitment not found" }, { status: 404 });
    }

    // Verification requires approve permission
    if (
      parsed.data.verification_status === "VERIFIED" &&
      !roleHasPermission(identity.currentRole, "handover.approve")
    ) {
      return NextResponse.json(
        { error: "Forbidden: verifying commitments requires handover.approve permission" },
        { status: 403 }
      );
    }

    const updates: Record<string, any> = {
      ...parsed.data,
      updated_by: identity.effectiveUser.id,
      updated_at: new Date().toISOString(),
    };

    if (
      parsed.data.status === "COMPLETED" &&
      !updates.completion_date &&
      !existing.completion_date
    ) {
      updates.completion_date = new Date().toISOString().split("T")[0];
    }
    if (parsed.data.verification_status === "VERIFIED") {
      updates.verified_by = identity.effectiveUser.id;
      updates.verified_at = new Date().toISOString();
    }

    const { data: updated, error } = await adminClient
      .from("handover_commitments")
      .update(updates)
      .eq("id", commitmentId)
      .select()
      .single();

    if (error) {
      console.error("[API/handover/commitments/[commitmentId] PATCH]", error);
      return NextResponse.json({ error: "Failed to update commitment" }, { status: 500 });
    }

    await recordAuditLog({
      actorUserId: identity.originalUser.id,
      effectiveUserId: identity.effectiveUser.id,
      societyId,
      action: "HANDOVER_COMMITMENT_UPDATED",
      resourceType: "handover_commitment",
      resourceId: commitmentId,
      metadata: {
        previous_status: existing.status,
        new_status: updated.status,
        verification_status: updated.verification_status,
        project_id: projectId,
      },
    });

    return NextResponse.json({ success: true, commitment: updated });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Internal Server Error" }, { status: 500 });
  }
}
