import React from "react";
import { requireCompanyAccess } from "@/lib/auth/server";
import { CompanyService } from "@/lib/services/companyService";
import { CompanyOperationsService } from "@/lib/services/companyOperationsService";
import { OperationsWorkspaceClient } from "./OperationsWorkspaceClient";

export default async function CompanyOperationsPage({
  params,
}: {
  params: Promise<{ companyId: string }>;
}) {
  const { companyId } = await params;
  const { identity, company, role } = await requireCompanyAccess(companyId);

  const [accessibleSocieties, members, tasksData] = await Promise.all([
    CompanyService.getUserAccessibleSocieties(companyId, identity.effectiveUser.id),
    CompanyService.listMembers(companyId, identity.effectiveUser.id),
    CompanyOperationsService.getTasks(companyId, {}, identity.effectiveUser.id),
  ]);

  return (
    <OperationsWorkspaceClient
      company={company}
      accessibleSocieties={accessibleSocieties}
      members={members}
      initialTasks={tasksData.tasks}
      role={role}
      currentUserId={identity.effectiveUser.id}
    />
  );
}
