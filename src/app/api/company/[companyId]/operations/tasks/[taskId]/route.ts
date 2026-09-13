import { NextResponse } from "next/server";
import { getCurrentIdentity } from "@/lib/auth/server";
import { CompanyOperationsService } from "@/lib/services/companyOperationsService";
import { UpdateCompanyTaskSchema } from "@/lib/validations/company";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ companyId: string; taskId: string }> }
) {
  try {
    const identity = await getCurrentIdentity();
    if (!identity || !identity.isAuthenticated) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { companyId, taskId } = await params;

    const result = await CompanyOperationsService.getTaskById(
      companyId,
      taskId,
      identity.effectiveUser.id
    );

    return NextResponse.json(result);
  } catch (err: any) {
    const status = err.message?.startsWith("FORBIDDEN")
      ? 403
      : err.message?.includes("not found")
      ? 404
      : err.message?.startsWith("UNAUTHORIZED")
      ? 401
      : 500;
    return NextResponse.json({ error: err.message || "Failed to fetch task details" }, { status });
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ companyId: string; taskId: string }> }
) {
  try {
    const identity = await getCurrentIdentity();
    if (!identity || !identity.isAuthenticated) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { companyId, taskId } = await params;
    const body = await req.json();
    const validated = UpdateCompanyTaskSchema.parse(body);

    const task = await CompanyOperationsService.updateTask(
      companyId,
      taskId,
      validated,
      identity.effectiveUser.id
    );

    return NextResponse.json({ task });
  } catch (err: any) {
    const status = err.message?.startsWith("FORBIDDEN")
      ? 403
      : err.message?.includes("not found")
      ? 404
      : err.message?.startsWith("INVALID_ASSIGNMENT")
      ? 400
      : err.message?.startsWith("UNAUTHORIZED")
      ? 401
      : 400;
    return NextResponse.json({ error: err.message || "Failed to update task" }, { status });
  }
}
