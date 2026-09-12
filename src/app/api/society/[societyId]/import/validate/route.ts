import { NextResponse } from "next/server";
import { requireSocietyAccess } from "@/lib/auth/server";
import { validateImportData } from "@/lib/services/import/validationEngine";
import { ImportType } from "@/lib/services/import/types";

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
        { error: "Forbidden: Only society management roles can perform dry-run validation." },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { importType, rows, columnMapping } = body;

    if (!importType || !rows || !Array.isArray(rows) || !columnMapping) {
      return NextResponse.json(
        { error: "Missing required validation parameters: importType, rows, and columnMapping." },
        { status: 400 }
      );
    }

    const summary = await validateImportData({
      societyId,
      importType: importType as ImportType,
      rows,
      columnMapping,
    });

    return NextResponse.json({
      success: true,
      data: summary,
    });
  } catch (error: any) {
    console.error("[import/validate] Error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to validate import data." },
      { status: 400 }
    );
  }
}

