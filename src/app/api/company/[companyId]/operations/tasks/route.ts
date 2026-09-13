import { NextResponse } from "next/server";
import { getCurrentIdentity } from "@/lib/auth/server";
import { CompanyOperationsService } from "@/lib/services/companyOperationsService";
import { CreateCompanyTaskSchema, CompanyTaskQuerySchema } from "@/lib/validations/company";

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

    const queryParams: Record<string, any> = {};
    if (url.searchParams.get("society_id")) queryParams.society_id = url.searchParams.get("society_id");
    if (url.searchParams.get("status")) queryParams.status = url.searchParams.get("status");
    if (url.searchParams.get("priority")) queryParams.priority = url.searchParams.get("priority");
    if (url.searchParams.get("category")) queryParams.category = url.searchParams.get("category");
    if (url.searchParams.get("assigned_to")) queryParams.assigned_to = url.searchParams.get("assigned_to");
    if (url.searchParams.get("search")) queryParams.search = url.searchParams.get("search");
    if (url.searchParams.get("overdue_only")) queryParams.overdue_only = url.searchParams.get("overdue_only");
    if (url.searchParams.get("page")) queryParams.page = url.searchParams.get("page");
    if (url.searchParams.get("limit")) queryParams.limit = url.searchParams.get("limit");

    const validatedQuery = CompanyTaskQuerySchema.parse(queryParams);

    const result = await CompanyOperationsService.getTasks(
      companyId,
      validatedQuery,
      identity.effectiveUser.id
    );

    return NextResponse.json(result);
  } catch (err: any) {
    const status = err.message?.startsWith("FORBIDDEN")
      ? 403
      : err.message?.startsWith("UNAUTHORIZED")
      ? 401
      : 400;
    return NextResponse.json({ error: err.message || "Failed to fetch operational tasks" }, { status });
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
    const validated = CreateCompanyTaskSchema.parse(body);

    const task = await CompanyOperationsService.createTask(
      companyId,
      validated,
      identity.effectiveUser.id
    );

    return NextResponse.json({ task }, { status: 201 });
  } catch (err: any) {
    const status = err.message?.startsWith("FORBIDDEN")
      ? 403
      : err.message?.startsWith("UNAUTHORIZED")
      ? 401
      : 400;
    return NextResponse.json({ error: err.message || "Failed to create operational task" }, { status });
  }
}
