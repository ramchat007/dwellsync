import { NextRequest, NextResponse } from "next/server";
import { requireSocietyAccess, roleHasPermission } from "@/lib/auth/server";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { previewBillingCalculation } from "@/lib/billing/calculationEngine";
import { GenerateInvoicesSchema } from "@/lib/validations/billing";

export const dynamic = "force-dynamic";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ societyId: string }> }
) {
  try {
    const { societyId } = await params;
    const { identity } = await requireSocietyAccess(societyId);

    if (!roleHasPermission(identity.currentRole, PERMISSIONS.BILLING_VIEW)) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 403 });
    }

    const body = await request.json();
    const parsed = GenerateInvoicesSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: "Invalid parameters", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const preview = await previewBillingCalculation(
      societyId,
      parsed.data.billing_cycle_id,
      parsed.data.charge_config_id
    );

    return NextResponse.json({ success: true, data: preview });
  } catch (error: any) {
    console.error("[API:BillingPreview] Error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to calculate billing preview" },
      { status: 500 }
    );
  }
}

