import { NextResponse } from "next/server";
import { getCurrentIdentity } from "@/lib/auth/server";
import { CompanyService } from "@/lib/services/companyService";
import { UpdateCompanyMemberSchema } from "@/lib/validations/company";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ companyId: string; memberId: string }> }
) {
  try {
    const identity = await getCurrentIdentity();
    if (!identity || !identity.isAuthenticated) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { companyId, memberId } = await params;
    const body = await req.json();
    const validated = UpdateCompanyMemberSchema.parse(body);

    const updated = await CompanyService.updateMember(
      companyId,
      memberId,
      {
        role: validated.role,
        status: validated.status,
      },
      identity.effectiveUser.id
    );

    return NextResponse.json({ member: updated });
  } catch (err: any) {
    const status = err.message?.startsWith("FORBIDDEN") ? 403 : 400;
    return NextResponse.json({ error: err.message || "Failed to update member" }, { status });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ companyId: string; memberId: string }> }
) {
  try {
    const identity = await getCurrentIdentity();
    if (!identity || !identity.isAuthenticated) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { companyId, memberId } = await params;
    const revoked = await CompanyService.updateMember(
      companyId,
      memberId,
      { status: "REVOKED" },
      identity.effectiveUser.id
    );

    return NextResponse.json({ member: revoked, success: true });
  } catch (err: any) {
    const status = err.message?.startsWith("FORBIDDEN") ? 403 : 400;
    return NextResponse.json({ error: err.message || "Failed to revoke member" }, { status });
  }
}

