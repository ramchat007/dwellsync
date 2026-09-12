import { NextResponse } from "next/server";
import { getCurrentIdentity } from "@/lib/auth/server";
import { CompanyService } from "@/lib/services/companyService";
import { UpdateStaffAssignmentSchema } from "@/lib/validations/company";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ companyId: string; assignmentId: string }> }
) {
  try {
    const identity = await getCurrentIdentity();
    if (!identity || !identity.isAuthenticated) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { companyId, assignmentId } = await params;
    const body = await req.json();
    const validated = UpdateStaffAssignmentSchema.parse(body);

    const updated = await CompanyService.updateStaffAssignment(
      companyId,
      assignmentId,
      {
        assignmentType: validated.assignment_type,
        status: validated.status,
        endDate: validated.end_date,
      },
      identity.effectiveUser.id
    );

    return NextResponse.json({ assignment: updated });
  } catch (err: any) {
    const status = err.message?.startsWith("FORBIDDEN") ? 403 : 400;
    return NextResponse.json({ error: err.message || "Failed to update staff assignment" }, { status });
  }
}

