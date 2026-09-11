import { NextResponse } from "next/server";
import { getCurrentIdentity, requireSocietyAccess } from "@/lib/auth/server";
import { getSocietyEntitlementSummary } from "@/lib/services/entitlementService";

export const dynamic = "force-dynamic";

export async function GET(
  req: Request,
  context: { params: Promise<{ societyId: string }> }
) {
  try {
    const { societyId } = await context.params;
    const { identity } = await requireSocietyAccess(societyId);

    // Residents, owners, tenants cannot access subscription internals
    const allowedRoles = ["SUPER_ADMIN", "SOCIETY_ADMIN", "SECRETARY", "TREASURER", "MANAGER"];
    const currentRole = identity.currentRole || "";
    if (!allowedRoles.includes(currentRole) && !identity.isSuperAdmin) {
      return NextResponse.json(
        { error: "Forbidden: You do not have permission to view society subscription details." },
        { status: 403 }
      );
    }

    const summary = await getSocietyEntitlementSummary(societyId);

    return NextResponse.json({ summary });
  } catch (err: any) {
    console.error("[API/society/subscription] GET Exception:", err);
    return NextResponse.json({ error: err?.message || "Internal server error" }, { status: 500 });
  }
}
