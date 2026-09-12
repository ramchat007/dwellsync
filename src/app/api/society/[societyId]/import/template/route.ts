import { NextResponse } from "next/server";
import { requireSocietyAccess } from "@/lib/auth/server";
import {
  generateTemplateCsv,
  generateTemplateXlsx,
} from "@/lib/services/import/templateGenerator";
import { ImportType } from "@/lib/services/import/types";

export const dynamic = "force-dynamic";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ societyId: string }> }
) {
  try {
    const { societyId } = await params;
    await requireSocietyAccess(societyId);

    const { searchParams } = new URL(req.url);
    const importType = (searchParams.get("type") || "UNITS_STRUCTURE") as ImportType;
    const format = (searchParams.get("format") || "csv").toLowerCase();

    if (format === "xlsx") {
      const buffer = generateTemplateXlsx(importType);
      return new NextResponse(new Uint8Array(buffer), {
        headers: {
          "Content-Type":
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          "Content-Disposition": `attachment; filename="${importType.toLowerCase()}_template.xlsx"`,
        },
      });
    }

    const csvContent = generateTemplateCsv(importType);
    return new NextResponse(csvContent, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${importType.toLowerCase()}_template.csv"`,
      },
    });
  } catch (error: any) {
    console.error("[import/template] Error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to generate template." },
      { status: 500 }
    );
  }
}

