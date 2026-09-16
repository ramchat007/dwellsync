import { NextRequest, NextResponse } from "next/server";
import { getCurrentIdentity } from "@/lib/auth/server";
import { isAuthorizedSocietyAdmin } from "@/lib/auth/societyAdmin";
import { validateImportData } from "@/lib/services/import/validationEngine";
import { isValidUuid } from "@/lib/utils";

export const dynamic = "force-dynamic";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ societyId: string }> }
) {
  try {
    const { societyId } = await params;
    if (!isValidUuid(societyId)) {
      return NextResponse.json({ error: "Invalid society ID format." }, { status: 400 });
    }

    const identity = await getCurrentIdentity();
    if (!identity || !identity.isAuthenticated) {
      return NextResponse.json({ error: "Authentication required." }, { status: 401 });
    }

    if (!isAuthorizedSocietyAdmin(identity, societyId)) {
      return NextResponse.json(
        { error: "Forbidden: Society administrator privileges required for unit bulk import validation." },
        { status: 403 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const { rows, columnMapping } = body;

    if (!rows || !Array.isArray(rows) || rows.length === 0) {
      return NextResponse.json(
        { error: "Rows array is required and must not be empty." },
        { status: 400 }
      );
    }

    if (!columnMapping || typeof columnMapping !== "object") {
      return NextResponse.json(
        { error: "Column mapping object is required." },
        { status: 400 }
      );
    }

    if (rows.length > 500) {
      return NextResponse.json(
        { error: "Bulk import payload exceeds maximum limit of 500 units per batch." },
        { status: 400 }
      );
    }

    const summary = await validateImportData({
      societyId,
      importType: "UNITS_STRUCTURE",
      rows,
      columnMapping,
    });

    return NextResponse.json({
      success: true,
      data: summary,
    });
  } catch (error: any) {
    console.error("[units/import/validate] Error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to validate unit import data." },
      { status: 400 }
    );
  }
}
