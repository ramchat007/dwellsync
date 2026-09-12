import React from "react";
import { requireCompanyAccess } from "@/lib/auth/server";
import { CompanyService } from "@/lib/services/companyService";
import { CompanyDashboardClient } from "./CompanyDashboardClient";

export default async function CompanyDashboardPage({
  params,
}: {
  params: Promise<{ companyId: string }>;
}) {
  const { companyId } = await params;
  const { identity, company, role } = await requireCompanyAccess(companyId);

  const [metrics, accessibleSocieties] = await Promise.all([
    CompanyService.getDashboardMetrics(companyId, identity.effectiveUser.id),
    CompanyService.getUserAccessibleSocieties(companyId, identity.effectiveUser.id),
  ]);

  return (
    <CompanyDashboardClient
      company={company}
      metrics={metrics}
      accessibleSocieties={accessibleSocieties}
      role={role}
    />
  );
}

