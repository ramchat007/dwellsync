import { NextResponse } from "next/server";
import { getCurrentIdentity } from "@/lib/auth/server";
import { CompanyService } from "@/lib/services/companyService";
import { GrantSocietyAccessSchema, UpdateSocietyAccessSchema } from "@/lib/validations/company";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ companyId: string; societyId: string }> }
) {
  try {
    const identity = await getCurrentIdentity();
    if (!identity || !identity.isAuthenticated) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { companyId, societyId } = await params;
    const accessList = await CompanyService.listSocietyAccess(
      companyId,
      societyId,
      identity.effectiveUser.id
    );

    return NextResponse.json({ access: accessList });
  } catch (err: any) {
    const status = err.message?.startsWith("FORBIDDEN") ? 403 : 500;
    return NextResponse.json({ error: err.message || "Failed to list access records" }, { status });
  }
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ companyId: string; societyId: string }> }
) {
  try {
    const identity = await getCurrentIdentity();
    if (!identity || !identity.isAuthenticated) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { companyId } = await params;
    const body = await req.json();
    const validated = GrantSocietyAccessSchema.parse(body);

    const access = await CompanyService.grantSocietyAccess(
      companyId,
      {
        memberId: validated.management_company_member_id,
        societyAssignmentId: validated.management_company_society_id,
        status: validated.status,
      },
      identity.effectiveUser.id
    );

    return NextResponse.json({ access }, { status: 201 });
  } catch (err: any) {
    const status = err.message?.startsWith("FORBIDDEN") ? 403 : 400;
    return NextResponse.json({ error: err.message || "Failed to grant society access" }, { status });
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ companyId: string; societyId: string }> }
) {
  try {
    const identity = await getCurrentIdentity();
    if (!identity || !identity.isAuthenticated) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { companyId } = await params;
    const url = new URL(req.url);
    const accessId = url.searchParams.get("accessId");

    if (!accessId) {
      return NextResponse.json({ error: "accessId query parameter is required" }, { status: 400 });
    }

    const body = await req.json();
    const validated = UpdateSocietyAccessSchema.parse(body);

    const updated = await CompanyService.updateSocietyAccess(
      companyId,
      accessId,
      validated.status,
      identity.effectiveUser.id
    );

    return NextResponse.json({ access: updated });
  } catch (err: any) {
    const status = err.message?.startsWith("FORBIDDEN") ? 403 : 400;
    return NextResponse.json({ error: err.message || "Failed to update society access" }, { status });
  }
}

