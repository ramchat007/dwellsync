import { NextResponse } from "next/server";
import { getCurrentIdentity } from "@/lib/auth/server";
import { CompanyService } from "@/lib/services/companyService";
import { UpdateSocietyAssignmentSchema } from "@/lib/validations/company";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ companyId: string; societyId: string }> }
) {
  try {
    const identity = await getCurrentIdentity();
    if (!identity || !identity.isAuthenticated) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { companyId, societyId } = await params;
    const body = await req.json();
    const validated = UpdateSocietyAssignmentSchema.parse(body);

    const updated = await CompanyService.updateSocietyAssignment(
      companyId,
      societyId,
      validated.status,
      identity.effectiveUser.id
    );

    return NextResponse.json({ assignment: updated });
  } catch (err: any) {
    const status = err.message?.startsWith("FORBIDDEN") ? 403 : 400;
    return NextResponse.json({ error: err.message || "Failed to update society assignment" }, { status });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ companyId: string; societyId: string }> }
) {
  try {
    const identity = await getCurrentIdentity();
    if (!identity || !identity.isAuthenticated) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { companyId, societyId } = await params;
    const deactivated = await CompanyService.updateSocietyAssignment(
      companyId,
      societyId,
      "INACTIVE",
      identity.effectiveUser.id
    );

    return NextResponse.json({ assignment: deactivated, success: true });
  } catch (err: any) {
    const status = err.message?.startsWith("FORBIDDEN") ? 403 : 400;
    return NextResponse.json({ error: err.message || "Failed to deactivate society assignment" }, { status });
  }
}

