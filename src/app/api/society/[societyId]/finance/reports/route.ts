import { NextRequest, NextResponse } from "next/server";
import { requireSocietyAccess, roleHasPermission } from "@/lib/auth/server";
import { PERMISSIONS } from "@/lib/auth/permissions";
import {
  generateBalanceSheet,
  generateIncomeAndExpenditure,
  generateTrialBalance,
  publishFinancialReport,
} from "@/lib/services/financeService";
import { createAdminClient } from "@/lib/supabase/admin";

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
    const type = searchParams.get("type") || "TRIAL_BALANCE";
    const asOfDate = searchParams.get("asOfDate") || undefined;
    const yearId = searchParams.get("yearId") || undefined;

    let data: any = null;

    if (type === "BALANCE_SHEET") {
      data = await generateBalanceSheet(societyId, asOfDate);
    } else if (type === "INCOME_EXPENDITURE") {
      data = await generateIncomeAndExpenditure(societyId, yearId);
    } else if (type === "PUBLISHED_LIST") {
      const adminClient = createAdminClient();
      const { data: list } = await adminClient
        .from("financial_reports")
        .select("*")
        .eq("society_id", societyId)
        .order("created_at", { ascending: false });
      data = list || [];
    } else {
      data = await generateTrialBalance(societyId, asOfDate);
    }

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    console.error("[API:ReportsGET] Error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to generate financial report" },
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

    if (!roleHasPermission(identity.currentRole, PERMISSIONS.FINANCE_REPORTS_PUBLISH)) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 403 });
    }

    const body = await request.json();
    const { reportType, title, notes } = body;

    if (!reportType || !title) {
      return NextResponse.json(
        { success: false, error: "Report type and title are required" },
        { status: 400 }
      );
    }

    const published = await publishFinancialReport(
      societyId,
      { reportType, title, notes },
      identity.effectiveUser.id
    );

    return NextResponse.json({ success: true, data: published });
  } catch (error: any) {
    console.error("[API:ReportsPOST] Error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to publish financial report" },
      { status: 500 }
    );
  }
}

