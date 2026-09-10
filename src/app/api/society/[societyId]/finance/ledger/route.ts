import { NextRequest, NextResponse } from "next/server";
import { requireSocietyAccess, roleHasPermission } from "@/lib/auth/server";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { getGeneralLedger } from "@/lib/services/financeService";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ societyId: string }> }
) {
  try {
    const { societyId } = await params;
    const { identity } = await requireSocietyAccess(societyId);

    if (!roleHasPermission(identity.currentRole, PERMISSIONS.FINANCE_VIEW)) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const accountId = searchParams.get("accountId");
    const startDate = searchParams.get("startDate") || undefined;
    const endDate = searchParams.get("endDate") || undefined;

    if (!accountId) {
      return NextResponse.json({ success: false, error: "Account ID is required" }, { status: 400 });
    }

    const ledger = await getGeneralLedger(societyId, accountId, startDate, endDate);

    return NextResponse.json({ success: true, data: ledger });
  } catch (error: any) {
    console.error("[API:LedgerGET] Error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to load general ledger" },
      { status: 500 }
    );
  }
}

