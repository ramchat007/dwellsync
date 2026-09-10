import { NextRequest, NextResponse } from "next/server";
import { requireSocietyAccess, roleHasPermission } from "@/lib/auth/server";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { getSocietyBankAccounts, createBankAccount } from "@/lib/services/financeService";
import { CreateBankAccountSchema } from "@/lib/validations/finance";

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

    const accounts = await getSocietyBankAccounts(societyId);
    return NextResponse.json({ success: true, data: accounts });
  } catch (error: any) {
    console.error("[API:BankAccountsGET] Error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to load bank accounts" },
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
    const parsed = CreateBankAccountSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: "Invalid bank account payload", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const bankAccount = await createBankAccount(societyId, parsed.data, identity.effectiveUser.id);
    return NextResponse.json({ success: true, data: bankAccount });
  } catch (error: any) {
    console.error("[API:BankAccountsPOST] Error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to create bank account" },
      { status: 500 }
    );
  }
}

