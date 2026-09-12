import React from "react";
import { requireCompanyAccess } from "@/lib/auth/server";
import { CompanyService } from "@/lib/services/companyService";
import { CompanySocietiesClient } from "./CompanySocietiesClient";

export default async function CompanySocietiesPage({
  params,
}: {
  params: Promise<{ companyId: string }>;
}) {
  const { companyId } = await params;
  const { identity, company, role } = await requireCompanyAccess(companyId);

  const [societies, members] = await Promise.all([
    CompanyService.listSocieties(companyId, identity.effectiveUser.id),
    CompanyService.listMembers(companyId, identity.effectiveUser.id),
  ]);

  return (
    <CompanySocietiesClient
      company={company}
      societies={societies}
      members={members}
      role={role}
    />
  );
}

