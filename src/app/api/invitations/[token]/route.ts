import { NextResponse } from "next/server";
import { getCurrentIdentity } from "@/lib/auth/server";
import { getInvitationByToken, acceptInvitation } from "@/lib/services/invitationService";

export const dynamic = "force-dynamic";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;
    const result = await getInvitationByToken(token);

    if (!result.success || !result.data) {
      return NextResponse.json({ error: result.error || "Invalid invitation" }, { status: 404 });
    }

    const inv = result.data;
    const [local, domain] = inv.email.split("@");
    const maskedEmail = local.length > 2
      ? `${local[0]}***${local[local.length - 1]}@${domain}`
      : `${local[0]}***@${domain}`;

    return NextResponse.json({
      success: true,
      invitation: {
        id: inv.id,
        societyId: inv.society_id,
        society: inv.society,
        roleId: inv.role_id,
        unitNumber: inv.unit_number,
        unit: (inv as any).unit,
        emailMasked: maskedEmail,
        expiresAt: inv.expires_at,
      },
    });
  } catch (error) {
    console.error("[API/invitations/[token] GET] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const identity = await getCurrentIdentity();
    if (!identity || !identity.isAuthenticated) {
      return NextResponse.json({ error: "Please sign in to accept this invitation." }, { status: 401 });
    }

    const { token } = await params;
    const result = await acceptInvitation(
      token,
      identity.effectiveUser.id,
      identity.effectiveUser.email
    );

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      message: "Invitation accepted successfully!",
      data: result.data,
    });
  } catch (error) {
    console.error("[API/invitations/[token] POST] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
