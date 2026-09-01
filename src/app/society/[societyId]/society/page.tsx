import React from "react";
import { requireSocietyAccess, roleHasPermission } from "@/lib/auth/server";
import { SocietyProfileClient } from "./SocietyProfileClient";

export const dynamic = "force-dynamic";

export default async function SocietyProfilePage({
  params,
}: {
  params: Promise<{ societyId: string }>;
}) {
  const { societyId } = await params;
  const { identity, society } = await requireSocietyAccess(societyId);

  const canEdit =
    identity.isSuperAdmin ||
    roleHasPermission(identity.currentRole, "society.manage") ||
    identity.isSocietyAdmin;

  return (
    <SocietyProfileClient
      societyId={societyId}
      initialSociety={society}
      canEdit={canEdit}
    />
  );
}
