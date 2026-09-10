import { NextRequest, NextResponse } from "next/server";
import { requireSocietyAccess, roleHasPermission } from "@/lib/auth/server";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { createAdminClient } from "@/lib/supabase/admin";
import { createJournalEntry } from "@/lib/services/financeService";
import { CreateJournalEntrySchema } from "@/lib/validations/finance";

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
    const limit = Number(searchParams.get("limit") || "50");
    const periodId = searchParams.get("periodId");

    const adminClient = createAdminClient();
    let query = adminClient
      .from("journal_entries")
      .select("*, lines:journal_lines(*, account:chart_of_accounts(account_code, account_name))")
      .eq("society_id", societyId)
      .order("entry_date", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(limit);

    if (periodId) {
      query = query.eq("financial_period_id", periodId);
    }

    const { data, error } = await query;
    if (error) throw new Error(error.message);

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    console.error("[API:JournalGET] Error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to load journal entries" },
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
    const parsed = CreateJournalEntrySchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: "Invalid journal entry payload", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const entry = await createJournalEntry(societyId, parsed.data, identity.effectiveUser.id);

    return NextResponse.json({ success: true, data: entry });
  } catch (error: any) {
    console.error("[API:JournalPOST] Error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to record journal entry" },
      { status: 500 }
    );
  }
}

