import { NextRequest, NextResponse } from "next/server";
import { getCurrentIdentity } from "@/lib/auth/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { recordAuditLog } from "@/lib/auth/audit";
import { UpdateNotificationPreferencesSchema } from "@/lib/validations/notifications";
import { NotificationCategory } from "@/lib/notifications/types";

const ALL_CATEGORIES: NotificationCategory[] = [
  "SECURITY",
  "BILLING",
  "COMPLAINTS",
  "NOTICES",
  "AMENITIES",
  "EVENTS",
  "GENERAL",
];

export async function GET(req: NextRequest) {
  try {
    const identity = await getCurrentIdentity();
    if (!identity || !identity.isAuthenticated) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const societyId = identity.currentSociety?.id;
    if (!societyId) {
      return NextResponse.json({ error: "No active society context" }, { status: 400 });
    }

    const userId = identity.effectiveUser.id;
    const adminClient = createAdminClient();

    const { data: storedPrefs, error } = await adminClient
      .from("notification_preferences")
      .select("*")
      .eq("society_id", societyId)
      .eq("user_id", userId);

    if (error) {
      return NextResponse.json({ error: "Failed to fetch preferences" }, { status: 500 });
    }

    // Merge with defaults for all categories
    const prefMap = new Map((storedPrefs || []).map((p: any) => [p.category, p]));

    const completePreferences = ALL_CATEGORIES.map((cat) => {
      const existing = prefMap.get(cat);
      if (existing) return existing;
      return {
        user_id: userId,
        society_id: societyId,
        category: cat,
        email_enabled: true,
        sms_enabled: false,
        whatsapp_enabled: false,
        in_app_enabled: true,
      };
    });

    return NextResponse.json({
      success: true,
      preferences: completePreferences,
    });
  } catch (err: any) {
    console.error("[Notification Preferences GET] Exception:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const identity = await getCurrentIdentity();
    if (!identity || !identity.isAuthenticated) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const societyId = identity.currentSociety?.id;
    if (!societyId) {
      return NextResponse.json({ error: "No active society context" }, { status: 400 });
    }

    const userId = identity.effectiveUser.id;
    const body = await req.json();
    const parseResult = UpdateNotificationPreferencesSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        { error: "Invalid preferences format", details: parseResult.error.flatten() },
        { status: 400 }
      );
    }

    const { preferences } = parseResult.data;
    const adminClient = createAdminClient();

    for (const pref of preferences) {
      // Enforce immutable security rule at API layer as well
      const inApp = pref.category === "SECURITY" ? true : (pref.in_app_enabled !== false);

      const now = new Date().toISOString();
      const { error: upsertErr } = await adminClient
        .from("notification_preferences")
        .upsert(
          {
            user_id: userId,
            society_id: societyId,
            category: pref.category,
            email_enabled: pref.email_enabled ?? true,
            sms_enabled: pref.sms_enabled ?? false,
            whatsapp_enabled: pref.whatsapp_enabled ?? false,
            in_app_enabled: inApp,
            updated_at: now,
          },
          { onConflict: "user_id,society_id,category" }
        );

      if (upsertErr) {
        console.error("[Notification Preferences PATCH] Upsert error:", upsertErr);
        return NextResponse.json({ error: upsertErr.message || "Failed to update preferences" }, { status: 500 });
      }
    }

    await recordAuditLog({
      actorUserId: identity.user.id,
      effectiveUserId: userId,
      societyId,
      action: "NOTIFICATION_PREFERENCES_UPDATED",
      resourceType: "notification_preferences",
      metadata: { categoriesUpdated: preferences.map((p) => p.category) },
    });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("[Notification Preferences PATCH] Exception:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
