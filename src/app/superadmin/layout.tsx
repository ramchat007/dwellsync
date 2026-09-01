import React from "react";
import { redirect } from "next/navigation";
import { getCurrentIdentity } from "@/lib/auth/server";
import { AppShell } from "@/components/shell/AppShell";

export const dynamic = "force-dynamic";

export default async function SuperAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const identity = await getCurrentIdentity();

  if (!identity || !identity.isSuperAdmin || identity.isImpersonating) {
    redirect("/unauthorized");
  }

  return <AppShell>{children}</AppShell>;
}
