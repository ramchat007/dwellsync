import { NextResponse } from "next/server";
import { getCurrentIdentity } from "@/lib/auth/server";
import { CompanyService } from "@/lib/services/companyService";
import { AddCompanyMemberSchema } from "@/lib/validations/company";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ companyId: string }> }
) {
  try {
    const identity = await getCurrentIdentity();
    if (!identity || !identity.isAuthenticated) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { companyId } = await params;
    const members = await CompanyService.listMembers(companyId, identity.effectiveUser.id);
    return NextResponse.json({ members });
  } catch (err: any) {
    const status = err.message?.startsWith("UNAUTHORIZED") ? 403 : 500;
    return NextResponse.json({ error: err.message || "Failed to list members" }, { status });
  }
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ companyId: string }> }
) {
  try {
    const identity = await getCurrentIdentity();
    if (!identity || !identity.isAuthenticated) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { companyId } = await params;
    const body = await req.json();
    const validated = AddCompanyMemberSchema.parse(body);

    const member = await CompanyService.addMember(
      companyId,
      {
        userId: validated.user_id,
        email: validated.email,
        role: validated.role,
        status: validated.status,
      },
      identity.effectiveUser.id
    );

    return NextResponse.json({ member }, { status: 201 });
  } catch (err: any) {
    const status = err.message?.startsWith("FORBIDDEN") ? 403 : 400;
    return NextResponse.json({ error: err.message || "Failed to add company member" }, { status });
  }
}

