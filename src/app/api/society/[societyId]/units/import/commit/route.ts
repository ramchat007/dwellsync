import { NextRequest, NextResponse } from "next/server";
import { getCurrentIdentity } from "@/lib/auth/server";
import { isAuthorizedSocietyAdmin } from "@/lib/auth/societyAdmin";
import { executeImportCommit } from "@/lib/services/import/importExecutor";
import { ImportFileFormat } from "@/lib/services/import/types";
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
        { error: "Forbidden: Society administrator privileges required to commit unit bulk imports." },
        { status: 403 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const {
      rows,
      columnMapping,
      confirmed,
      fileName,
      fileFormat,
      fileSizeBytes,
    } = body;

    if (!confirmed) {
      return NextResponse.json(
        { error: "Explicit confirmation is required before committing bulk unit imports." },
        { status: 400 }
      );
    }

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

    const result = await executeImportCommit({
      societyId,
      importType: "UNITS_STRUCTURE",
      fileName: fileName || "units_inventory.csv",
      fileFormat: (fileFormat as ImportFileFormat) || "csv",
      fileSizeBytes: fileSizeBytes || 0,
      rows,
      columnMapping,
      actorUserId: identity.effectiveUser.id,
    });

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    console.error("[units/import/commit] Error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to commit unit bulk import." },
      { status: 500 }
    );
  }
}
