import { NextResponse } from "next/server";
import { getCurrentIdentity } from "@/lib/auth/server";
import { CompanyService } from "@/lib/services/companyService";
import { UpdateCompanySchema } from "@/lib/validations/company";

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
    const company = await CompanyService.getCompany(companyId, identity.effectiveUser.id);
    return NextResponse.json({ company });
  } catch (err: any) {
    const status = err.message?.startsWith("UNAUTHORIZED") ? 403 : 500;
    return NextResponse.json({ error: err.message || "Failed to load company" }, { status });
  }
}

export async function PATCH(
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
    const validated = UpdateCompanySchema.parse(body);

    const updated = await CompanyService.updateCompany(companyId, validated, identity.effectiveUser.id);
    return NextResponse.json({ company: updated });
  } catch (err: any) {
    const status = err.message?.startsWith("FORBIDDEN") ? 403 : 400;
    return NextResponse.json({ error: err.message || "Failed to update company" }, { status });
  }
}

