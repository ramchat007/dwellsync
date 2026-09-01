import React from "react";
import { redirect } from "next/navigation";
import { getCurrentIdentity } from "@/lib/auth/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { SocietyDetailClient } from "./SocietyDetailClient";
import { Society, Building, Unit, SocietyMembership, Profile, AuditLog } from "@/lib/types/database";

export const dynamic = "force-dynamic";

export default async function SuperAdminSocietyDetailPage({
  params,
}: {
  params: Promise<{ societyId: string }>;
}) {
  const identity = await getCurrentIdentity();
  if (!identity || !identity.isSuperAdmin) {
    redirect("/unauthorized");
  }

  const { societyId } = await params;
  const adminClient = createAdminClient();

  const [societyRes, buildingsRes, unitsRes, membersRes, auditRes] = await Promise.all([
    adminClient.from("societies").select("*").eq("id", societyId).single(),
    adminClient.from("buildings").select("*").eq("society_id", societyId).order("name"),
    adminClient.from("units").select("*").eq("society_id", societyId).order("unit_number"),
    adminClient
      .from("society_memberships")
      .select(`*, profile:profiles(*)`)
      .eq("society_id", societyId)
      .neq("status", "REMOVED"),
    adminClient
      .from("audit_logs")
      .select("*")
      .eq("society_id", societyId)
      .order("created_at", { ascending: false })
      .limit(20),
  ]);

  if (societyRes.error || !societyRes.data) {
    redirect("/superadmin/societies");
  }

  const society = societyRes.data as Society;
  const buildings = (buildingsRes.data as Building[]) || [];
  const units = (unitsRes.data as Unit[]) || [];
  const members = (membersRes.data as (SocietyMembership & { profile?: Profile })[]) || [];
  const admins = members.filter((m) => m.role_id === "SOCIETY_ADMIN" || m.role_id === "SECRETARY");
  const auditLogs = (auditRes.data as AuditLog[]) || [];

  return (
    <SocietyDetailClient
      society={society}
      buildings={buildings}
      units={units}
      members={members}
      admins={admins}
      auditLogs={auditLogs}
    />
  );
}

