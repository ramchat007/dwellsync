import React from "react";
import { requireSocietyAccess } from "@/lib/auth/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { SocietySettingsClient } from "./SocietySettingsClient";
import { SocietySettings } from "@/lib/types/database";

export const dynamic = "force-dynamic";

const MANAGEMENT_ROLES = ["SUPER_ADMIN", "SOCIETY_ADMIN", "SECRETARY", "MANAGER", "TREASURER"];

export default async function SocietySettingsPage({
  params,
}: {
  params: Promise<{ societyId: string }>;
}) {
  const { societyId } = await params;
  const { identity, society } = await requireSocietyAccess(societyId);

  const adminClient = createAdminClient();

  const { data: dbSettings } = await adminClient
    .from("society_settings")
    .select("*")
    .eq("society_id", societyId)
    .maybeSingle();

  const initialSettings: SocietySettings = dbSettings || {
    society_id: societyId,
    financial_year_start_month: 4,
    agm_due_month: 9,
    quorum_percentage: 30.0,
    default_meeting_duration_minutes: 60,
    require_visitor_preapproval: false,
    auto_escalate_complaints: true,
    rules_and_by_laws: null,
    emergency_contacts: [],
    created_at: society.created_at,
    updated_at: society.updated_at,
  };

  const canManage =
    (identity.currentRole ? MANAGEMENT_ROLES.includes(identity.currentRole) : false) || identity.isSuperAdmin;

  return (
    <SocietySettingsClient
      societyId={societyId}
      initialSociety={society}
      initialSettings={initialSettings}
      canManage={canManage}
      userRole={identity.currentRole || "RESIDENT"}
    />
  );
}
