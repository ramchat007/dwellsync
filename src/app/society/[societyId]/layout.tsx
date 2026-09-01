import React from "react";
import { requireSocietyAccess } from "@/lib/auth/server";
import { AppShell } from "@/components/shell/AppShell";

export const dynamic = "force-dynamic";

export default async function SocietyLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ societyId: string }>;
}) {
  const { societyId } = await params;
  await requireSocietyAccess(societyId);

  return <AppShell>{children}</AppShell>;
}
