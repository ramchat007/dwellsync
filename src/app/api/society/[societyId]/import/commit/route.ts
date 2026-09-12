import { NextResponse } from "next/server";
import { requireSocietyAccess } from "@/lib/auth/server";
import { executeImportCommit } from "@/lib/services/import/importExecutor";
import { ImportType, ImportFileFormat } from "@/lib/services/import/types";

const MANAGEMENT_ROLES = ["SUPER_ADMIN", "SOCIETY_ADMIN", "SECRETARY", "MANAGER", "TREASURER"];

export const dynamic = "force-dynamic";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ societyId: string }> }
) {
  try {
    const { societyId } = await params;
    const { identity } = await requireSocietyAccess(societyId);

    if (!identity.isSuperAdmin && (!identity.currentRole || !MANAGEMENT_ROLES.includes(identity.currentRole))) {
      return NextResponse.json(
        { error: "Forbidden: Only society management roles can commit data imports." },
        { status: 403 }
      );
    }

    const body = await req.json();
    const {
      importType,
      fileName,
      fileFormat,
      fileSizeBytes,
      rows,
      columnMapping,
      confirmed,
    } = body;

    if (!confirmed) {
      return NextResponse.json(
        { error: "Explicit user confirmation is required before committing import data." },
        { status: 400 }
      );
    }

    if (!importType || !rows || !Array.isArray(rows) || !columnMapping) {
      return NextResponse.json(
        { error: "Missing required commit parameters." },
        { status: 400 }
      );
    }

    const result = await executeImportCommit({
      societyId,
      importType: importType as ImportType,
      fileName: fileName || "import_data.csv",
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
    console.error("[import/commit] Error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to commit import data." },
      { status: 500 }
    );
  }
}

