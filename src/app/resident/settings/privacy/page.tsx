import React from "react";
import { redirect } from "next/navigation";
import { getCurrentIdentity } from "@/lib/auth/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { PrivacySettingsClient } from "./PrivacySettingsClient";
import { ProfilePrivacySettings } from "@/lib/types/database";

export const dynamic = "force-dynamic";

export default async function ResidentPrivacyPage() {
  const identity = await getCurrentIdentity();
  if (!identity || !identity.isAuthenticated) {
    redirect("/login");
  }

  const adminClient = createAdminClient();
  const userId = identity.effectiveUser.id;

  const { data: privacy } = await adminClient
    .from("profile_privacy_settings")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  const defaultPrivacy: ProfilePrivacySettings = privacy || {
    id: "",
    user_id: userId,
    profile_visible_in_directory: true,
    phone_visible_in_directory: false,
    email_visible_in_directory: false,
    allow_neighbor_chat: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto">
      <PrivacySettingsClient initialPrivacy={defaultPrivacy} />
    </div>
  );
}

