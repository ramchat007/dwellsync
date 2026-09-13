import { NextResponse } from "next/server";
import { getCurrentIdentity } from "@/lib/auth/server";
import { CompanyOperationsService } from "@/lib/services/companyOperationsService";
import { CreateCompanyTaskCommentSchema } from "@/lib/validations/company";

export async function POST(
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
    const validated = CreateCompanyTaskCommentSchema.parse(body);

    const comment = await CompanyOperationsService.addTaskComment(
      companyId,
      taskId,
      validated.comment,
      identity.effectiveUser.id
    );

    return NextResponse.json({ comment }, { status: 201 });
  } catch (err: any) {
    const status = err.message?.startsWith("FORBIDDEN")
      ? 403
      : err.message?.includes("not found")
      ? 404
      : 400;
    return NextResponse.json({ error: err.message || "Failed to add comment" }, { status });
  }
}
