import { NextRequest, NextResponse } from "next/server";
import { requireSocietyAccess, roleHasPermission } from "@/lib/auth/server";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { getExpenseVouchers, createExpenseVoucher } from "@/lib/services/financeService";
import { CreateExpenseVoucherSchema } from "@/lib/validations/finance";

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
    const status = searchParams.get("status") || undefined;
    const limit = Number(searchParams.get("limit") || "50");

    const vouchers = await getExpenseVouchers(societyId, { status, limit });
    return NextResponse.json({ success: true, data: vouchers });
  } catch (error: any) {
    console.error("[API:ExpensesGET] Error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to load expense vouchers" },
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

    if (!roleHasPermission(identity.currentRole, PERMISSIONS.FINANCE_MANAGE)) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 403 });
    }

    const body = await request.json();
    const parsed = CreateExpenseVoucherSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: "Invalid expense voucher payload", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const voucher = await createExpenseVoucher(societyId, parsed.data, identity.effectiveUser.id);
    return NextResponse.json({ success: true, data: voucher });
  } catch (error: any) {
    console.error("[API:ExpensesPOST] Error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to record expense voucher" },
      { status: 500 }
    );
  }
}

