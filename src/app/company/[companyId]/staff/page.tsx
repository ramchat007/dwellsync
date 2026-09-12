import React from "react";
import { requireCompanyAccess } from "@/lib/auth/server";
import { CompanyService } from "@/lib/services/companyService";
import { CompanyStaffClient } from "./CompanyStaffClient";

export default async function CompanyStaffPage({
  params,
}: {
  params: Promise<{ companyId: string }>;
}) {
  const { companyId } = await params;
  const { identity, company, role } = await requireCompanyAccess(companyId);

  const [assignments, societies, members] = await Promise.all([
    CompanyService.listStaffAssignments(companyId, identity.effectiveUser.id),
    CompanyService.listSocieties(companyId, identity.effectiveUser.id),
    CompanyService.listMembers(companyId, identity.effectiveUser.id),
  ]);

  return (
    <CompanyStaffClient
      company={company}
      assignments={assignments}
      societies={societies}
      members={members}
      role={role}
    />
  );
}

