import { NextRequest, NextResponse } from "next/server";
import { requireSocietyAccess, roleHasPermission } from "@/lib/auth/server";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { getChartOfAccounts, seedDefaultChartOfAccounts, createAccount } from "@/lib/services/financeService";
import { CreateAccountSchema } from "@/lib/validations/finance";

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

    // Auto-seed standard accounts if empty
    let accounts = await getChartOfAccounts(societyId);
    if (accounts.length === 0) {
      accounts = await seedDefaultChartOfAccounts(societyId, identity.effectiveUser.id);
    }

    return NextResponse.json({ success: true, data: accounts });
  } catch (error: any) {
    console.error("[API:COAGET] Error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to fetch Chart of Accounts" },
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
    const parsed = CreateAccountSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: "Invalid account payload", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const account = await createAccount(societyId, parsed.data, identity.effectiveUser.id);

    return NextResponse.json({ success: true, data: account });
  } catch (error: any) {
    console.error("[API:COAPOST] Error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to create account" },
      { status: 500 }
    );
  }
}

