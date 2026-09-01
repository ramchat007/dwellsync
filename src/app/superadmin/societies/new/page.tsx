import React from "react";
import { getCurrentIdentity } from "@/lib/auth/server";
import { redirect } from "next/navigation";
import { OnboardingWizard } from "./OnboardingWizard";

export const dynamic = "force-dynamic";

export default async function SuperAdminNewSocietyPage() {
  const identity = await getCurrentIdentity();
  if (!identity || !identity.isSuperAdmin) {
    redirect("/unauthorized");
  }

  return <OnboardingWizard />;
}

