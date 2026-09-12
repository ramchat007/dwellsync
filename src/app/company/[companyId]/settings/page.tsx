import React from "react";
import { requireCompanyAccess } from "@/lib/auth/server";
import { CompanyService } from "@/lib/services/companyService";
import { CompanySettingsClient } from "./CompanySettingsClient";

export default async function CompanySettingsPage({
  params,
}: {
  params: Promise<{ companyId: string }>;
}) {
  const { companyId } = await params;
  const { identity, company, role } = await requireCompanyAccess(companyId);

  const members = await CompanyService.listMembers(companyId, identity.effectiveUser.id);

  return (
    <CompanySettingsClient
      company={company}
      members={members}
      role={role}
    />
  );
}

