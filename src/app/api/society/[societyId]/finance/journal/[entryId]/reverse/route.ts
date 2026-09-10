import { NextRequest, NextResponse } from "next/server";
import { requireSocietyAccess, roleHasPermission } from "@/lib/auth/server";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { reverseJournalEntry } from "@/lib/services/financeService";
import { ReverseJournalEntrySchema } from "@/lib/validations/finance";

export const dynamic = "force-dynamic";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ societyId: string; entryId: string }> }
) {
  try {
    const { societyId, entryId } = await params;
    const { identity } = await requireSocietyAccess(societyId);

    if (!roleHasPermission(identity.currentRole, PERMISSIONS.FINANCE_MANAGE)) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 403 });
    }

    const body = await request.json();
    const parsed = ReverseJournalEntrySchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: "A mandatory reversal reason is required", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const reversal = await reverseJournalEntry(
      societyId,
      entryId,
      parsed.data.reason,
      identity.effectiveUser.id
    );

    return NextResponse.json({ success: true, data: reversal });
  } catch (error: any) {
    console.error("[API:ReverseJournalPOST] Error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to reverse journal entry" },
      { status: 500 }
    );
  }
}

