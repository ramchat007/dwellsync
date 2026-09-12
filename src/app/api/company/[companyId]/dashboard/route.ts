import { NextResponse } from "next/server";
import { getCurrentIdentity } from "@/lib/auth/server";
import { CompanyService } from "@/lib/services/companyService";

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
    const [company, metrics, accessibleSocieties] = await Promise.all([
      CompanyService.getCompany(companyId, identity.effectiveUser.id),
      CompanyService.getDashboardMetrics(companyId, identity.effectiveUser.id),
      CompanyService.getUserAccessibleSocieties(companyId, identity.effectiveUser.id),
    ]);

    return NextResponse.json({
      company,
      metrics,
      accessibleSocieties,
    });
  } catch (err: any) {
    const status = err.message?.startsWith("UNAUTHORIZED") ? 403 : 500;
    return NextResponse.json({ error: err.message || "Failed to load dashboard metrics" }, { status });
  }
}

