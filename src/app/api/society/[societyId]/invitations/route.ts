import { NextResponse } from "next/server";
import { requireSocietyAccess } from "@/lib/auth/server";
import { createInvitation, getInvitations } from "@/lib/services/invitationService";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ societyId: string }> }
) {
  try {
    const { societyId } = await params;
    await requireSocietyAccess(societyId);

    const invites = await getInvitations(societyId);
    return NextResponse.json({ success: true, data: invites });
  } catch (error) {
    console.error("[invitations GET] Error:", error);
    return NextResponse.json({ error: "Failed to fetch invitations" }, { status: 500 });
  }
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ societyId: string }> }
) {
  try {
    const { societyId } = await params;
    const { identity } = await requireSocietyAccess(societyId);

    const body = await req.json();
    const result = await createInvitation(
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
    console.error("[invitations POST] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

