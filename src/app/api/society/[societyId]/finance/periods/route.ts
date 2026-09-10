import { NextRequest, NextResponse } from "next/server";
import { requireSocietyAccess, roleHasPermission } from "@/lib/auth/server";
import { PERMISSIONS } from "@/lib/auth/permissions";
import {
  getFinancialYears,
  getFinancialPeriods,
  createFinancialYear,
  lockFinancialPeriod,
  unlockFinancialPeriod,
} from "@/lib/services/financeService";
import { CreateFinancialYearSchema, LockFinancialPeriodSchema } from "@/lib/validations/finance";

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
    const yearId = searchParams.get("yearId") || undefined;

    const [years, periods] = await Promise.all([
      getFinancialYears(societyId),
      getFinancialPeriods(societyId, yearId),
    ]);

    return NextResponse.json({ success: true, data: { years, periods } });
  } catch (error: any) {
    console.error("[API:PeriodsGET] Error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to load financial periods" },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ societyId: string }> }
) {
  try {
    const { societyId } = await params;
    const { identity } = await requireSocietyAccess(societyId);

    if (!roleHasPermission(identity.currentRole, PERMISSIONS.FINANCE_PERIOD_MANAGE)) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 403 });
    }

    const body = await request.json();
    const action = body.action || "CREATE_YEAR";

    if (action === "LOCK_PERIOD") {
      const periodId = body.periodId;
      const parsed = LockFinancialPeriodSchema.safeParse(body);
      if (!parsed.success || !periodId) {
        return NextResponse.json(
          { success: false, error: "Valid period ID and mandatory lock reason required" },
          { status: 400 }
        );
      }
      const period = await lockFinancialPeriod(societyId, periodId, parsed.data.lock_reason, identity.effectiveUser.id);
      return NextResponse.json({ success: true, data: period });
    }

    if (action === "UNLOCK_PERIOD") {
      const periodId = body.periodId;
      if (!periodId) {
        return NextResponse.json({ success: false, error: "Period ID required" }, { status: 400 });
      }
      const period = await unlockFinancialPeriod(societyId, periodId, identity.effectiveUser.id);
      return NextResponse.json({ success: true, data: period });
    }

    // Default: CREATE_YEAR
    const parsedYear = CreateFinancialYearSchema.safeParse(body);
    if (!parsedYear.success) {
      return NextResponse.json(
        { success: false, error: "Invalid financial year payload", details: parsedYear.error.flatten() },
        { status: 400 }
      );
    }

    const res = await createFinancialYear(societyId, parsedYear.data, identity.effectiveUser.id);
    return NextResponse.json({ success: true, data: res });
  } catch (error: any) {
    console.error("[API:PeriodsPOST] Error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to process period operation" },
      { status: 500 }
    );
  }
}

