import { NextRequest, NextResponse } from "next/server";
import { getCurrentIdentity } from "@/lib/auth/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { NotificationQuerySchema } from "@/lib/validations/notifications";

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

    const recipientId = identity.effectiveUser.id;
    const url = new URL(req.url);
    const parseResult = NotificationQuerySchema.safeParse({
      page: url.searchParams.get("page") || 1,
      limit: url.searchParams.get("limit") || 20,
      category: url.searchParams.get("category") || undefined,
      unreadOnly: url.searchParams.get("unreadOnly") || undefined,
    });

    if (!parseResult.success) {
      return NextResponse.json(
        { error: "Invalid query parameters", details: parseResult.error.flatten() },
        { status: 400 }
      );
    }

    const { page, limit, category, unreadOnly } = parseResult.data;
    const offset = (page - 1) * limit;

    const adminClient = createAdminClient();

    // Query unread count
    const { count: unreadCount, error: countErr } = await adminClient
      .from("notifications")
      .select("*", { count: "exact", head: true })
      .eq("society_id", societyId)
      .eq("recipient_id", recipientId)
      .eq("is_read", false);

    if (countErr) {
      console.error("[Notifications API] Error fetching unread count:", countErr);
    }

    // Query notifications
    let query = adminClient
      .from("notifications")
      .select("*", { count: "exact" })
      .eq("society_id", societyId)
      .eq("recipient_id", recipientId)
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (category) {
      query = query.eq("category", category);
    }

    if (unreadOnly === "true") {
      query = query.eq("is_read", false);
    }

    const { data: notifications, count: totalCount, error: listErr } = await query;

    if (listErr) {
      console.error("[Notifications API] Error listing notifications:", listErr);
      return NextResponse.json({ error: "Failed to fetch notifications" }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      notifications: notifications || [],
      unreadCount: unreadCount || 0,
      pagination: {
        page,
        limit,
        total: totalCount || 0,
        totalPages: Math.ceil((totalCount || 0) / limit),
      },
    });
  } catch (err: any) {
    console.error("[Notifications API] Exception:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
