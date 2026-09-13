import { NextResponse } from "next/server";
import { getCurrentIdentity } from "@/lib/auth/server";
import { CompanyOperationsService } from "@/lib/services/companyOperationsService";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ companyId: string }> }
) {
  try {
    const identity = await getCurrentIdentity();
    if (!identity || !identity.isAuthenticated) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { companyId } = await params;

    const metrics = await CompanyOperationsService.getOperationalMetrics(
      companyId,
      identity.effectiveUser.id
    );

    return NextResponse.json({ metrics });
  } catch (err: any) {
    const status = err.message?.startsWith("UNAUTHORIZED") ? 401 : 500;
    return NextResponse.json({ error: err.message || "Failed to fetch operational summary" }, { status });
  }
}
