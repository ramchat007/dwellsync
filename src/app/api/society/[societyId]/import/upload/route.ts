import { NextResponse } from "next/server";
import { requireSocietyAccess } from "@/lib/auth/server";
import { parseSpreadsheetBuffer } from "@/lib/services/import/fileParser";
import { detectColumnMappings } from "@/lib/services/import/columnDetector";
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
        { error: "Forbidden: Only society management roles can perform data imports." },
        { status: 403 }
      );
    }

    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const importType = formData.get("importType") as ImportType | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided for upload." }, { status: 400 });
    }

    if (!importType) {
      return NextResponse.json({ error: "No importType specified." }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Safe parse buffer
    const parsed = parseSpreadsheetBuffer({
      fileName: file.name,
      buffer,
    });

    // Detect column mappings
    const detectedMappings = detectColumnMappings(importType, parsed.headers);

    // Initial mapping dictionary
    const initialMapping: Record<string, string> = {};
    for (const m of detectedMappings) {
      if (m.spreadsheetColumn) {
        initialMapping[m.canonicalField] = m.spreadsheetColumn;
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        fileName: parsed.fileName,
        fileFormat: parsed.fileFormat,
        fileSizeBytes: parsed.fileSizeBytes,
        totalRows: parsed.totalRows,
        headers: parsed.headers,
        detectedMappings,
        initialMapping,
        previewRows: parsed.rows.slice(0, 10),
        allRows: parsed.rows,
      },
    });
  } catch (error: any) {
    console.error("[import/upload] Error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to process uploaded file." },
      { status: 400 }
    );
  }
}

