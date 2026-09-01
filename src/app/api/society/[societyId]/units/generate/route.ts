import { NextResponse } from "next/server";
import { requireSocietyAccess } from "@/lib/auth/server";
import { bulkCreateUnits, generateUnitDefinitions } from "@/lib/services/unitBatchService";
import { unitBatchGenerationSchema } from "@/lib/validations/unit";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ societyId: string }> }
) {
  try {
    const { societyId } = await params;
    const { identity } = await requireSocietyAccess(societyId);

    const body = await req.json();
    const parsed = unitBatchGenerationSchema.safeParse({ ...body, society_id: societyId });

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
    }

    const unitsToCreate = body.units || generateUnitDefinitions(parsed.data);

    const result = await bulkCreateUnits(
      {
        society_id: societyId,
        building_id: parsed.data.building_id,
        wing_id: parsed.data.wing_id,
        units: unitsToCreate,
      },
      identity.originalUser.id
    );

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("[generate units API] Error:", error);
    return NextResponse.json({ error: "Failed to generate units" }, { status: 500 });
  }
}

