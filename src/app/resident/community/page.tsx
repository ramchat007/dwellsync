import React from "react";
import { redirect } from "next/navigation";
import { getCurrentIdentity } from "@/lib/auth/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { CommunityClient } from "./CommunityClient";

export const dynamic = "force-dynamic";

export default async function ResidentCommunityPage() {
  const identity = await getCurrentIdentity();
  if (!identity || !identity.isAuthenticated) {
    redirect("/login");
  }

  const societyId = identity.currentSociety?.id;
  const adminClient = createAdminClient();
  let sanitizedMembers: any[] = [];

  if (societyId) {
    const { data: memberships } = await adminClient
      .from("society_memberships")
      .select(`
        id,
        user_id,
        role_id,
        unit_number,
        status,
        profile:profiles (
          id,
          full_name,
          display_name,
          avatar_url,
          phone,
          email
        )
      `)
      .eq("society_id", societyId)
      .eq("status", "ACTIVE");

    const userIds = memberships?.map((m) => m.user_id) || [];
    const { data: privacyRecords } = await adminClient
      .from("profile_privacy_settings")
      .select("*")
      .in("user_id", userIds);

    const privacyMap = new Map<string, any>();
    privacyRecords?.forEach((p) => privacyMap.set(p.user_id, p));

    sanitizedMembers = (memberships || [])
      .map((m: any) => {
        const privacy = privacyMap.get(m.user_id) || {
          profile_visible_in_directory: true,
          phone_visible_in_directory: false,
          email_visible_in_directory: false,
          allow_neighbor_chat: true,
        };

        if (!privacy.profile_visible_in_directory && m.user_id !== identity.effectiveUser.id) {
          return null;
        }

        const isSelf = m.user_id === identity.effectiveUser.id;
        const profile = m.profile || {};

        return {
          id: m.id,
          userId: m.user_id,
          name: profile.display_name || profile.full_name || "Resident",
          role: m.role_id,
          unitNumber: m.unit_number || "Unassigned",
          avatarUrl: profile.avatar_url,
          phone: isSelf || privacy.phone_visible_in_directory ? profile.phone : null,
          email: isSelf || privacy.email_visible_in_directory ? profile.email : null,
          allowChat: privacy.allow_neighbor_chat,
          isSelf,
        };
      })
      .filter(Boolean);
  }

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto">
      <CommunityClient
        members={sanitizedMembers}
        society={identity.currentSociety}
      />
    </div>
  );
}

