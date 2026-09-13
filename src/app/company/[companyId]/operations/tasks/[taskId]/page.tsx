import React from "react";
import { notFound } from "next/navigation";
import { requireCompanyAccess } from "@/lib/auth/server";
import { CompanyService } from "@/lib/services/companyService";
import { CompanyOperationsService } from "@/lib/services/companyOperationsService";
import { TaskDetailClient } from "./TaskDetailClient";

export default async function TaskDetailPage({
  params,
}: {
  params: Promise<{ companyId: string; taskId: string }>;
}) {
  const { companyId, taskId } = await params;
  const { identity, company, role } = await requireCompanyAccess(companyId);

  let taskData;
  try {
    taskData = await CompanyOperationsService.getTaskById(companyId, taskId, identity.effectiveUser.id);
  } catch (err: any) {
    if (err?.message?.includes("not found")) {
      notFound();
    }
    throw err;
  }

  const [members, accessibleSocieties] = await Promise.all([
    CompanyService.listMembers(companyId, identity.effectiveUser.id),
    CompanyService.getUserAccessibleSocieties(companyId, identity.effectiveUser.id),
  ]);

  return (
    <TaskDetailClient
      company={company}
      task={taskData.task}
      initialComments={taskData.comments}
      initialActivities={taskData.timeline}
      members={members}
      accessibleSocieties={accessibleSocieties}
      role={role}
      currentUserId={identity.effectiveUser.id}
    />
  );
}
