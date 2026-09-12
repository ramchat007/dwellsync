import { NextResponse } from "next/server";
import { getCurrentIdentity } from "@/lib/auth/server";
import { CompanyService } from "@/lib/services/companyService";
import { AssignSocietySchema } from "@/lib/validations/company";

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
    const societies = await CompanyService.listSocieties(companyId, identity.effectiveUser.id);
    return NextResponse.json({ societies });
  } catch (err: any) {
    const status = err.message?.startsWith("UNAUTHORIZED") ? 403 : 500;
    return NextResponse.json({ error: err.message || "Failed to list managed societies" }, { status });
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
    const validated = AssignSocietySchema.parse(body);

    const assignment = await CompanyService.assignSociety(
      companyId,
      validated.society_id,
      identity.effectiveUser.id
    );

    return NextResponse.json({ assignment }, { status: 201 });
  } catch (err: any) {
    const status = err.message?.startsWith("FORBIDDEN") ? 403 : 400;
    return NextResponse.json({ error: err.message || "Failed to assign society" }, { status });
  }
}

