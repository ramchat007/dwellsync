import React from "react";
import { redirect } from "next/navigation";
import { requireSocietyAccess } from "@/lib/auth/server";
import { isAuthorizedSocietyAdmin } from "@/lib/auth/societyAdmin";
import { getSocietyAccessRequests } from "@/lib/services/onboardingVerificationService";
import { VerificationsAdminClient } from "./VerificationsAdminClient";

export const dynamic = "force-dynamic";

export default async function SocietyVerificationsPage({
  params,
}: {
  params: Promise<{ societyId: string }>;
}) {
  const { societyId } = await params;
  const { identity, society } = await requireSocietyAccess(societyId);

  // Enforce Society Admin Authorization
  if (!isAuthorizedSocietyAdmin(identity, societyId)) {
    redirect("/unauthorized");
  }

  const requests = await getSocietyAccessRequests(societyId);

  return (
    <VerificationsAdminClient
      societyId={societyId}
      societyName={society.name}
      initialRequests={requests}
    />
  );
}
