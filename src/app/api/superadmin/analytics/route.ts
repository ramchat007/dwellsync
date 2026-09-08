import { NextRequest, NextResponse } from "next/server";
import { getCurrentIdentity } from "@/lib/auth/server";
import { getPlatformAnalytics } from "@/lib/services/analyticsService";
import { AnalyticsTimeframeEnum } from "@/lib/validations/analytics";
import { recordAuditLog } from "@/lib/auth/audit";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const identity = await getCurrentIdentity();
    if (!identity) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    if (identity.currentRole !== "SUPER_ADMIN") {
      return NextResponse.json(
        { success: false, error: "Forbidden: Platform analytics requires Super Admin authorization" },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const rawTimeframe = searchParams.get("timeframe") || "30d";
    const timeframeParsed = AnalyticsTimeframeEnum.safeParse(rawTimeframe);
    const timeframe = timeframeParsed.success ? timeframeParsed.data : "30d";

    const analytics = await getPlatformAnalytics(timeframe);

    await recordAuditLog({
      actorUserId: identity.effectiveUser.id,
      action: "platform.analytics.view",
      resourceType: "platform_analytics",
      metadata: { timeframe },
    });

    return NextResponse.json({ success: true, data: analytics });
  } catch (error: any) {
    console.error("[API:platformAnalytics] Error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to retrieve platform analytics" },
      { status: 500 }
    );
  }
}
