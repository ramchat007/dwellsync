import { NextResponse } from "next/server";
import { getCurrentIdentity, requireSocietyAccess } from "@/lib/auth/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { recordAuditLog } from "@/lib/auth/audit";
import { sendDomainNotification } from "@/lib/services/notificationService";
import { UpdateComplaintSchema } from "@/lib/validations/operations";
import { z } from "zod";

export const dynamic = "force-dynamic";

export async function GET(
  req: Request,
  context: { params: Promise<{ societyId: string }> }
) {
  try {
    const { societyId } = await context.params;
    await requireSocietyAccess(societyId);

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");
    const priority = searchParams.get("priority");
    const category = searchParams.get("category");

    const adminClient = createAdminClient();

    let query = adminClient
      .from("complaints")
      .select(`
        *,
        unit:units (
          id,
          unit_number,
          building:buildings (name, code),
          wing:wings (name, code)
        ),
        creator:profiles!complaints_created_by_fkey (
          id,
          full_name,
          display_name,
          email,
          phone
        ),
        assignee:profiles!complaints_assigned_to_fkey (
          id,
          full_name,
          display_name,
          email
        )
      `)
      .eq("society_id", societyId)
      .order("created_at", { ascending: false });

    if (status && status !== "ALL") {
      query = query.eq("status", status);
    }
    if (priority && priority !== "ALL") {
      query = query.eq("priority", priority);
    }
    if (category && category !== "ALL") {
      query = query.eq("category", category);
    }

    const { data: complaints, error } = await query;

    if (error) {
      console.error("[API/society/complaints] Error fetching complaints:", error);
      return NextResponse.json({ error: "Failed to fetch complaints" }, { status: 500 });
    }

    // Also fetch staff / managers in this society for easy assignment
    const { data: staffMembers } = await adminClient
      .from("society_memberships")
      .select(`
        user_id,
        role_id,
        user:profiles (
          id,
          full_name,
          display_name,
          email
        )
      `)
      .eq("society_id", societyId)
      .eq("status", "ACTIVE")
      .in("role_id", ["STAFF", "MANAGER", "SOCIETY_ADMIN", "SECRETARY", "COMMITTEE_MEMBER"]);

    return NextResponse.json({
      complaints: complaints || [],
      staffMembers: (staffMembers || []).map((sm) => ({
        ...sm.user,
        role_id: sm.role_id,
      })),
    });
  } catch (err: any) {
    console.error("[API/society/complaints] Exception:", err);
    return NextResponse.json(
      { error: err?.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}

const PatchComplaintBodySchema = UpdateComplaintSchema.extend({
  id: z.string().uuid("Invalid complaint ID"),
});

export async function PATCH(
  req: Request,
  context: { params: Promise<{ societyId: string }> }
) {
  try {
    const { societyId } = await context.params;
    const { identity } = await requireSocietyAccess(societyId);

    const body = await req.json();
    const parsed = PatchComplaintBodySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const adminClient = createAdminClient();
    const { id, status, assigned_to, resolution_notes } = parsed.data;

    // Verify complaint belongs to society
    const { data: existing, error: fetchErr } = await adminClient
      .from("complaints")
      .select("*")
      .eq("id", id)
      .eq("society_id", societyId)
      .single();

    if (fetchErr || !existing) {
      return NextResponse.json({ error: "Complaint not found in this society" }, { status: 404 });
    }

    const updates: Record<string, any> = {
      updated_at: new Date().toISOString(),
    };

    if (status !== undefined) {
      updates.status = status;
      if (status === "RESOLVED" && !existing.resolved_at) {
        updates.resolved_at = new Date().toISOString();
      }
      if (status === "CLOSED" && !existing.closed_at) {
        updates.closed_at = new Date().toISOString();
      }
    }

    if (assigned_to !== undefined) {
      updates.assigned_to = assigned_to || null;
      if (assigned_to && existing.status === "SUBMITTED" && !status) {
        updates.status = "ASSIGNED";
      }
    }

    if (resolution_notes !== undefined) {
      updates.resolution_notes = resolution_notes || null;
    }

    const { data: updated, error: updateErr } = await adminClient
      .from("complaints")
      .update(updates)
      .eq("id", id)
      .select(`
        *,
        unit:units (
          id,
          unit_number,
          building:buildings (name, code),
          wing:wings (name, code)
        ),
        creator:profiles!complaints_created_by_fkey (
          id,
          full_name,
          display_name
        ),
        assignee:profiles!complaints_assigned_to_fkey (
          id,
          full_name,
          display_name
        )
      `)
      .single();

    if (updateErr) {
      console.error("[API/society/complaints] Error updating complaint:", updateErr);
      return NextResponse.json({ error: "Failed to update complaint" }, { status: 500 });
    }

    // Determine audit action
    let auditAction = "COMPLAINT_STATUS_CHANGED";
    if (assigned_to && assigned_to !== existing.assigned_to) {
      auditAction = "COMPLAINT_ASSIGNED";
    } else if (status === "RESOLVED") {
      auditAction = "COMPLAINT_RESOLVED";
    } else if (status === "CLOSED") {
      auditAction = "COMPLAINT_CLOSED";
    }

    await recordAuditLog({
      actorUserId: identity.originalUser.id,
      effectiveUserId: identity.effectiveUser.id,
      societyId,
      action: auditAction,
      resourceType: "complaint",
      resourceId: id,
      metadata: {
        previous_status: existing.status,
        new_status: updated.status,
        assigned_to: updated.assigned_to,
        resolution_notes: updated.resolution_notes,
      },
    });

    // Notify complaint creator if status changed or assigned
    if (existing.created_by) {
      await sendDomainNotification({
        societyId,
        recipientIds: [existing.created_by],
        type: (auditAction as any) || "COMPLAINT_STATUS_CHANGED",
        category: "COMPLAINTS",
        actorId: identity.effectiveUser.id,
        data: {
          ticketNumber: existing.id.substring(0, 8),
          complaintId: existing.id,
          status: updated.status,
          assignedTo: updated.assignee?.full_name || null,
          remarks: updated.resolution_notes,
        },
      });
    }

    return NextResponse.json({ success: true, complaint: updated });
  } catch (err: any) {
    console.error("[API/society/complaints] Exception:", err);
    return NextResponse.json(
      { error: err?.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}
