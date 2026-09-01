import { NextResponse } from "next/server";
import { requireSocietyAccess } from "@/lib/auth/server";
import { updateSociety } from "@/lib/services/societyService";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ societyId: string }> }
) {
  try {
    const { societyId } = await params;
    const { identity } = await requireSocietyAccess(societyId);

    const body = await req.json();
    const result = await updateSociety(societyId, body, identity.originalUser.id);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("[society profile POST] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

