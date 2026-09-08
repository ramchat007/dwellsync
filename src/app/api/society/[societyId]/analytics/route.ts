import { NextRequest, NextResponse } from "next/server";
import { requireSocietyAccess } from "@/lib/auth/server";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { getSocietyAnalytics } from "@/lib/services/analyticsService";
import { AnalyticsTimeframeEnum } from "@/lib/validations/analytics";
import { recordAuditLog } from "@/lib/auth/audit";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ societyId: string }> }
) {
  try {
    const { societyId } = await params;
    const { identity } = await requireSocietyAccess(societyId);

    // Authorization check: Require ANALYTICS_VIEW or SOCIETY_VIEW
    const canView =
      identity.currentRole === "SUPER_ADMIN" ||
      identity.permissions.includes(PERMISSIONS.ANALYTICS_VIEW) ||
      identity.permissions.includes(PERMISSIONS.SOCIETY_VIEW);

    if (!canView) {
      return NextResponse.json(
        { success: false, error: "Forbidden: You do not have permission to view society analytics" },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const rawTimeframe = searchParams.get("timeframe") || "30d";
    const timeframeParsed = AnalyticsTimeframeEnum.safeParse(rawTimeframe);
    const timeframe = timeframeParsed.success ? timeframeParsed.data : "30d";

    const analytics = await getSocietyAnalytics(societyId, timeframe);

    // Audit log
    await recordAuditLog({
      actorUserId: identity.effectiveUser.id,
      societyId,
      action: "analytics.view",
      resourceType: "society_analytics",
      resourceId: societyId,
      metadata: { timeframe },
    });

    return NextResponse.json({ success: true, data: analytics });
  } catch (error: any) {
    console.error("[API:societyAnalytics] Error:", error);
    const status = error.message?.includes("Unauthorized") ? 401 : error.message?.includes("Forbidden") ? 403 : 500;
    return NextResponse.json(
      { success: false, error: error.message || "Failed to retrieve society analytics" },
      { status }
    );
  }
}
