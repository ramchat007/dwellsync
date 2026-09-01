import { NextResponse } from "next/server";
import { getCurrentIdentity } from "@/lib/auth/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const identity = await getCurrentIdentity();
    if (!identity || !identity.isAuthenticated) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const societyId = identity.currentSociety?.id;
    if (!societyId) {
      return NextResponse.json({ members: [] });
    }

    const adminClient = createAdminClient();

    // Fetch active memberships in this society with profiles
    const { data: memberships, error } = await adminClient
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

    if (error) {
      console.error("[API/resident/community] Error fetching members:", error);
      return NextResponse.json({ error: "Failed to fetch community members." }, { status: 500 });
    }

    // Fetch privacy settings for all users in this society
    const userIds = memberships?.map((m) => m.user_id) || [];
    const { data: privacyRecords } = await adminClient
      .from("profile_privacy_settings")
      .select("*")
      .in("user_id", userIds);

    const privacyMap = new Map<string, any>();
    privacyRecords?.forEach((p) => privacyMap.set(p.user_id, p));

    // Transform and sanitize member details according to each member's privacy settings
    const sanitizedMembers = (memberships || [])
      .map((m: any) => {
        const privacy = privacyMap.get(m.user_id) || {
          profile_visible_in_directory: true,
          phone_visible_in_directory: false,
          email_visible_in_directory: false,
          allow_neighbor_chat: true,
        };

        // If user hid entire profile from directory, exclude unless viewing oneself
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

    return NextResponse.json({ members: sanitizedMembers });
  } catch (err) {
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

