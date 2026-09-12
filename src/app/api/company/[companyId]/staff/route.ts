import { NextResponse } from "next/server";
import { getCurrentIdentity } from "@/lib/auth/server";
import { CompanyService } from "@/lib/services/companyService";
import { AssignStaffSchema } from "@/lib/validations/company";

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
    const url = new URL(req.url);
    const societyId = url.searchParams.get("societyId") || undefined;

    const assignments = await CompanyService.listStaffAssignments(
      companyId,
      identity.effectiveUser.id,
      societyId
    );

    return NextResponse.json({ assignments });
  } catch (err: any) {
    const status = err.message?.startsWith("UNAUTHORIZED") ? 403 : 500;
    return NextResponse.json({ error: err.message || "Failed to list staff assignments" }, { status });
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
    const validated = AssignStaffSchema.parse(body);

    const assignment = await CompanyService.assignStaff(
      companyId,
      {
        userId: validated.user_id,
        societyId: validated.society_id,
        assignmentType: validated.assignment_type,
        status: validated.status,
        startDate: validated.start_date,
        endDate: validated.end_date,
      },
      identity.effectiveUser.id
    );

    return NextResponse.json({ assignment }, { status: 201 });
  } catch (err: any) {
    const status = err.message?.startsWith("FORBIDDEN") ? 403 : 400;
    return NextResponse.json({ error: err.message || "Failed to assign staff" }, { status });
  }
}

