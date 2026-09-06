import { NextResponse } from "next/server";
import { getCurrentIdentity } from "@/lib/auth/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { recordAuditLog } from "@/lib/auth/audit";
import { sendDomainNotification } from "@/lib/services/notificationService";

import { checkGatePassRateLimit, recordGatePassFailure, resetGatePassAttempts } from "@/lib/auth/gateRateLimiter";

const ALLOWED_GATE_ROLES = ["SECURITY", "SOCIETY_ADMIN", "SECRETARY", "MANAGER"];

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const identity = await getCurrentIdentity();
    if (!identity || !identity.isAuthenticated) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const societyId = identity.currentSociety?.id;
    if (!societyId) {
      return NextResponse.json({ error: "No active society context" }, { status: 400 });
    }

    const isAuthorized =
      identity.isSuperAdmin ||
      (identity.currentRole && ALLOWED_GATE_ROLES.includes(identity.currentRole));

    if (!isAuthorized) {
      return NextResponse.json({ error: "Forbidden: Security clearance required." }, { status: 403 });
    }

    let body: any = {};
    try {
      body = await req.json();
    } catch (_) {
      // Body is optional
    }

    const gateNumber = body?.gate_number || "Main Gate";
    const passCodeAttempt = body?.pass_code;
    const guardUserId = identity.effectiveUser.id;
    const rateLimitKey = `gate:${societyId}:${guardUserId}`;

    // Rate Limiting Protection against 6-digit brute-force
    if (id === "verify-pass" || passCodeAttempt) {
      const rateCheck = checkGatePassRateLimit(rateLimitKey);
      if (!rateCheck.allowed) {
        await recordAuditLog({
          actorUserId: identity.user.id,
          effectiveUserId: guardUserId,
          societyId,
          action: "SUSPICIOUS_GATE_ATTEMPT",
          resourceType: "visitors",
          metadata: {
            reason: "RATE_LIMIT_EXCEEDED",
            retryAfterSeconds: rateCheck.retryAfterSeconds,
          },
        });

        return NextResponse.json(
          {
            error: `Too many failed pass verification attempts. Checkpoint verification locked. Please retry in ${rateCheck.retryAfterSeconds} seconds.`,
            retryAfterSeconds: rateCheck.retryAfterSeconds,
          },
          { status: 429 }
        );
      }
    }

    const adminClient = createAdminClient();

    // 1. Fetch visitor record in the guard's society
    let visitorQuery = adminClient
      .from("visitors")
      .select(`
        *,
        unit:units (
          id,
          unit_number
        )
      `)
      .eq("society_id", societyId);

    if (id === "verify-pass") {
      if (!passCodeAttempt) {
        return NextResponse.json({ error: "Pass code is required for verification." }, { status: 400 });
      }
      visitorQuery = visitorQuery.eq("pass_code", passCodeAttempt.trim());
    } else {
      visitorQuery = visitorQuery.eq("id", id);
    }

    const { data: visitor, error: fetchErr } = await visitorQuery.maybeSingle();

    if (fetchErr || !visitor) {
      if (id === "verify-pass" || passCodeAttempt) {
        const failRecord = recordGatePassFailure(rateLimitKey);
        if (failRecord.isLockedOut) {
          return NextResponse.json(
            {
              error: `Too many invalid attempts. Checkpoint verification locked for ${failRecord.retryAfterSeconds} seconds.`,
              isLockedOut: true,
            },
            { status: 429 }
          );
        }
      }
      return NextResponse.json(
        { error: "Invalid pass code or no active visitor found for this flat." },
        { status: 404 }
      );
    }

    // 2. Validate current status
    if (visitor.status === "CHECKED_IN") {
      return NextResponse.json(
        { error: "Visitor is already checked in on campus." },
        { status: 400 }
      );
    }

    if (visitor.status === "CHECKED_OUT") {
      return NextResponse.json(
        { error: "Visitor pass has already been checked out and completed." },
        { status: 400 }
      );
    }

    if (visitor.status === "CANCELLED" || visitor.status === "DENIED") {
      return NextResponse.json(
        { error: `Cannot check in visitor with status '${visitor.status}'.` },
        { status: 400 }
      );
    }

    // 3. If passCodeAttempt was provided alongside an ID, verify it matches
    if (passCodeAttempt && visitor.pass_code !== passCodeAttempt.trim()) {
      const failRecord = recordGatePassFailure(rateLimitKey);
      return NextResponse.json(
        { error: "Invalid 6-digit verification code.", isLockedOut: failRecord.isLockedOut },
        { status: 400 }
      );
    }

    // 4. Validate pass expiration window (max 48 hours validity unless specified)
    const nowMs = Date.now();
    if (visitor.valid_until && new Date(visitor.valid_until).getTime() < nowMs) {
      return NextResponse.json(
        { error: "Visitor pass has expired and is no longer valid." },
        { status: 400 }
      );
    }
    const createdAtMs = new Date(visitor.created_at).getTime();
    if (nowMs - createdAtMs > 48 * 60 * 60 * 1000) {
      return NextResponse.json(
        { error: "Visitor pass has expired (passes are valid for 48 hours)." },
        { status: 400 }
      );
    }

    // Reset rate limiter on successful verification
    resetGatePassAttempts(rateLimitKey);

    const now = new Date().toISOString();

    // 4. Update status to CHECKED_IN
    const { data: updated, error: updateErr } = await adminClient
      .from("visitors")
      .update({
        status: "CHECKED_IN",
        check_in_at: now,
        check_in_by: guardUserId,
        gate_number: gateNumber,
        updated_at: now,
      })
      .eq("id", visitor.id)
      .select(`
        *,
        unit:units (
          id,
          unit_number
        )
      `)
      .single();

    if (updateErr) {
      return NextResponse.json({ error: "Failed to update visitor check-in." }, { status: 500 });
    }

    // 5. Audit log
    await recordAuditLog({
      actorUserId: identity.user.id,
      effectiveUserId: guardUserId,
      societyId,
      action: "VISITOR_CHECKED_IN",
      resourceType: "visitors",
      resourceId: visitor.id,
      metadata: {
        visitor_name: visitor.visitor_name,
        unit_number: visitor.unit?.unit_number,
        gate_number: gateNumber,
        check_in_at: now,
      },
    });

    // 6. Send resident arrival notification (authoritative recipient resolution)
    if (visitor.unit_id) {
      await sendDomainNotification({
        societyId,
        unitId: visitor.unit_id,
        type: "VISITOR_CHECKED_IN",
        category: "SECURITY",
        actorId: guardUserId,
        data: {
          visitorName: visitor.visitor_name,
          visitorId: visitor.id,
          purpose: visitor.purpose,
          unitNumber: visitor.unit?.unit_number,
          vehicleNumber: visitor.vehicle_number,
          gateNumber,
          checkInAt: now,
        },
        dedupKey: `visitor_checkin_${visitor.id}`,
      });
    }

    return NextResponse.json({ success: true, visitor: updated });
  } catch (err) {
    console.error("[Security Visitor Check-In] Error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
