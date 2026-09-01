import { NextResponse } from "next/server";
import { requireSocietyAccess } from "@/lib/auth/server";
import { createWing } from "@/lib/services/buildingService";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ societyId: string }> }
) {
  try {
    const { societyId } = await params;
    const { identity } = await requireSocietyAccess(societyId);

    const body = await req.json();
    const result = await createWing(
      {
        ...body,
        society_id: societyId,
      },
      identity.originalUser.id
    );

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("[wings POST] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

