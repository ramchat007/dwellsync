import { NextResponse } from "next/server";
import { requireSocietyAccess } from "@/lib/auth/server";
import {
  canUseFeature,
  getSocietyEntitlementSummary,
} from "@/lib/services/entitlementService";
import { EntitledFeature } from "@/lib/types/database";

export const dynamic = "force-dynamic";

export async function GET(
  req: Request,
  context: { params: Promise<{ societyId: string }> }
) {
  try {
    const { societyId } = await context.params;
    await requireSocietyAccess(societyId);

    const { searchParams } = new URL(req.url);
    const feature = searchParams.get("feature");

    if (feature) {
      const check = await canUseFeature(societyId, feature as EntitledFeature);
      return NextResponse.json({ check });
    }

    const summary = await getSocietyEntitlementSummary(societyId);
    return NextResponse.json({ summary });
  } catch (err: any) {
    console.error("[API/society/entitlements] GET Exception:", err);
    return NextResponse.json({ error: err?.message || "Internal server error" }, { status: 500 });
  }
}

