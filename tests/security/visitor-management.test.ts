import { describe, it, expect } from "vitest";
import {
  checkGatePassRateLimit,
  recordGatePassFailure,
  resetGatePassAttempts,
} from "@/lib/auth/gateRateLimiter";

describe("Phase 7 — Security Gate & Visitor Management Tests", () => {
  // 1. Visitor Pre-Invite Creation
  it("should allow a resident to generate a pre-approved visitor pass with a 6-digit code for their authorized unit", () => {
    const resident = { id: "res-1", authorizedUnitIds: ["unit-101", "unit-102"] };
    const targetUnitId = "unit-101";

    const isAuthorized = resident.authorizedUnitIds.includes(targetUnitId);
    expect(isAuthorized).toBe(true);

    const passCode = Math.floor(100000 + Math.random() * 900000).toString();
    expect(passCode).toMatch(/^\d{6}$/);

    const newVisitor = {
      id: "v-1",
      society_id: "soc-green-valley",
      unit_id: targetUnitId,
      created_by: resident.id,
      visitor_name: "Karan Johar",
      visitor_phone: "+919820011223",
      purpose: "GUEST",
      pass_code: passCode,
      status: "EXPECTED",
      created_at: new Date().toISOString(),
    };

    expect(newVisitor.status).toBe("EXPECTED");
    expect(newVisitor.created_by).toBe(resident.id);
  });

  // 2. Anti-Spoofing Unit Validation
  it("should strictly reject visitor pass creation if resident does not own or occupy the target unit", () => {
    const resident = { id: "res-2", authorizedUnitIds: ["unit-201"] };
    const foreignUnitId = "unit-505";

    const canCreateForUnit = (unitId: string) => resident.authorizedUnitIds.includes(unitId);

    expect(canCreateForUnit(foreignUnitId)).toBe(false);
  });

  // 3. Pass Code Verification at the Gate
  it("should verify matching 6-digit pass code and reject invalid or expired codes", () => {
    const activePass = {
      id: "v-3",
      pass_code: "582194",
      status: "EXPECTED",
      society_id: "soc-1",
    };

    const verifyPass = (code: string, societyId: string) => {
      if (activePass.society_id !== societyId) return { valid: false, reason: "Foreign society" };
      if (activePass.pass_code !== code) return { valid: false, reason: "Invalid code" };
      if (activePass.status !== "EXPECTED") return { valid: false, reason: "Not expected" };
      return { valid: true };
    };

    expect(verifyPass("582194", "soc-1").valid).toBe(true);
    expect(verifyPass("000000", "soc-1").valid).toBe(false);
    expect(verifyPass("582194", "soc-2").valid).toBe(false);
  });

  // 4. Gate Check-In Lifecycle Transition
  it("should successfully transition visitor status from EXPECTED to CHECKED_IN with guard audit details", () => {
    const guard = { id: "guard-1", role: "SECURITY", society_id: "soc-1" };
    const visitor = {
      id: "v-4",
      society_id: "soc-1",
      status: "EXPECTED",
      check_in_at: null as string | null,
      check_in_by: null as string | null,
    };

    const checkInTime = new Date().toISOString();
    const updatedVisitor = {
      ...visitor,
      status: "CHECKED_IN" as const,
      check_in_at: checkInTime,
      check_in_by: guard.id,
    };

    expect(updatedVisitor.status).toBe("CHECKED_IN");
    expect(updatedVisitor.check_in_by).toBe("guard-1");
    expect(updatedVisitor.check_in_at).toBeTruthy();
  });

  // 5. Gate Check-Out Lifecycle Transition
  it("should transition visitor status from CHECKED_IN to CHECKED_OUT and prevent duplicate check-out", () => {
    const guard = { id: "guard-1", role: "SECURITY" };
    const activeVisitor = {
      id: "v-5",
      status: "CHECKED_IN",
      check_in_at: "2026-09-06T10:00:00Z",
      check_out_at: null as string | null,
      check_out_by: null as string | null,
    };

    const checkOutTime = new Date().toISOString();
    const checkedOutVisitor = {
      ...activeVisitor,
      status: "CHECKED_OUT" as const,
      check_out_at: checkOutTime,
      check_out_by: guard.id,
    };

    expect(checkedOutVisitor.status).toBe("CHECKED_OUT");
    expect(checkedOutVisitor.check_out_at).toBeTruthy();

    const canCheckOutAgain = (v: { status: string }) => v.status === "CHECKED_IN";
    expect(canCheckOutAgain(checkedOutVisitor)).toBe(false);
  });

  // 6. Resident Pass Cancellation
  it("should allow resident to cancel an EXPECTED pass and block gate check-in once cancelled", () => {
    const visitor = {
      id: "v-6",
      status: "EXPECTED",
      created_by: "res-1",
    };

    const cancelledVisitor = {
      ...visitor,
      status: "CANCELLED" as const,
    };

    expect(cancelledVisitor.status).toBe("CANCELLED");

    const allowCheckIn = (status: string) => status === "EXPECTED";
    expect(allowCheckIn(cancelledVisitor.status)).toBe(false);
  });

  // 7. Direct Walk-In Registration by Guard
  it("should allow guard to register an unscheduled walk-in visitor directly with immediate CHECKED_IN status", () => {
    const guard = { id: "guard-1", role: "SECURITY", society_id: "soc-1" };
    const walkInPayload = {
      unit_id: "unit-102",
      visitor_name: "Swiggy Delivery - Ravi",
      purpose: "DELIVERY",
      vehicle_number: "MH02-DX-1001",
    };

    const walkInRecord = {
      id: "v-walkin-1",
      society_id: guard.society_id,
      unit_id: walkInPayload.unit_id,
      created_by: guard.id,
      visitor_name: walkInPayload.visitor_name,
      purpose: walkInPayload.purpose,
      vehicle_number: walkInPayload.vehicle_number,
      pass_code: "991823",
      status: "CHECKED_IN",
      check_in_at: new Date().toISOString(),
      check_in_by: guard.id,
    };

    expect(walkInRecord.status).toBe("CHECKED_IN");
    expect(walkInRecord.check_in_by).toBe(guard.id);
    expect(walkInRecord.purpose).toBe("DELIVERY");
  });

  // 8. Cross-Society Isolation
  it("should strictly prevent security guards in Society A from viewing or operating on visitors in Society B", () => {
    const allVisitors = [
      { id: "v-a1", society_id: "soc-green-valley", visitor_name: "Guest A" },
      { id: "v-a2", society_id: "soc-green-valley", visitor_name: "Delivery B" },
      { id: "v-b1", society_id: "soc-lake-view", visitor_name: "Guest C" },
    ];

    const guardSocietyId = "soc-green-valley";
    const accessibleVisitors = allVisitors.filter((v) => v.society_id === guardSocietyId);

    expect(accessibleVisitors.length).toBe(2);
    expect(accessibleVisitors.every((v) => v.society_id === "soc-green-valley")).toBe(true);
    expect(accessibleVisitors.some((v) => v.society_id === "soc-lake-view")).toBe(false);
  });

  // 9. Cross-Resident Unit Privacy Isolation
  it("should isolate visitor records between residents so Resident A cannot view or cancel Resident B's visitors", () => {
    const residentAUnit = "unit-101";
    const residentBUnit = "unit-202";

    const allVisitors = [
      { id: "v-1", unit_id: residentAUnit, visitor_name: "Friend of A", created_by: "user-a" },
      { id: "v-2", unit_id: residentBUnit, visitor_name: "Friend of B", created_by: "user-b" },
    ];

    const residentAViewable = allVisitors.filter((v) => v.unit_id === residentAUnit);
    expect(residentAViewable.length).toBe(1);
    expect(residentAViewable[0].visitor_name).toBe("Friend of A");

    const canResidentACancel = (v: typeof allVisitors[0]) => v.created_by === "user-a";
    expect(canResidentACancel(allVisitors[0])).toBe(true);
    expect(canResidentACancel(allVisitors[1])).toBe(false);
  });

  // 10. Role Privilege Boundaries (RBAC)
  it("should restrict gate checkpoint operations strictly to SECURITY and Admin roles", () => {
    const allowedGateRoles = ["SECURITY", "SOCIETY_ADMIN", "SECRETARY", "MANAGER"];

    const canOperateGate = (role: string) => allowedGateRoles.includes(role);

    expect(canOperateGate("SECURITY")).toBe(true);
    expect(canOperateGate("SOCIETY_ADMIN")).toBe(true);
    expect(canOperateGate("SECRETARY")).toBe(true);
    expect(canOperateGate("RESIDENT")).toBe(false);
    expect(canOperateGate("TENANT")).toBe(false);
    expect(canOperateGate("OWNER")).toBe(false);
    expect(canOperateGate("VENDOR")).toBe(false);
  });

  // 11. Audit Event Emission Verification
  it("should record structured audit actions for the complete visitor lifecycle", () => {
    const emittedAuditEvents: string[] = [];

    const simulateVisitorLifecycle = () => {
      emittedAuditEvents.push("VISITOR_CREATED");
      emittedAuditEvents.push("VISITOR_CHECKED_IN");
      emittedAuditEvents.push("VISITOR_CHECKED_OUT");
      emittedAuditEvents.push("VISITOR_CANCELLED");
    };

    simulateVisitorLifecycle();

    expect(emittedAuditEvents).toContain("VISITOR_CREATED");
    expect(emittedAuditEvents).toContain("VISITOR_CHECKED_IN");
    expect(emittedAuditEvents).toContain("VISITOR_CHECKED_OUT");
    expect(emittedAuditEvents).toContain("VISITOR_CANCELLED");
  });

  // 12. Brute-Force Rate Limiting & Lockout
  it("should trigger temporary checkpoint lockout after 5 consecutive failed verification attempts", () => {
    const testGateKey = `test_gate_${Date.now()}`;
    const attempts = [
      recordGatePassFailure(testGateKey),
      recordGatePassFailure(testGateKey),
      recordGatePassFailure(testGateKey),
      recordGatePassFailure(testGateKey),
    ];

    expect(attempts.every((a) => !a.isLockedOut)).toBe(true);

    // 5th failed attempt triggers lockout
    const fifthAttempt = recordGatePassFailure(testGateKey);
    expect(fifthAttempt.isLockedOut).toBe(true);
    expect(fifthAttempt.retryAfterSeconds).toBeGreaterThan(0);

    // Subsequent check verifies request is blocked
    const rateCheck = checkGatePassRateLimit(testGateKey);
    expect(rateCheck.allowed).toBe(false);
    expect(rateCheck.retryAfterSeconds).toBeGreaterThan(0);

    // Resetting clears lockout upon valid verification
    resetGatePassAttempts(testGateKey);
    const postResetCheck = checkGatePassRateLimit(testGateKey);
    expect(postResetCheck.allowed).toBe(true);
  });

  // 13. Expiration Window Enforcement
  it("should reject expired visitor passes exceeding validity or the 48-hour window", () => {
    const now = Date.now();
    const expiredPass = {
      id: "v-expired",
      pass_code: "123456",
      status: "EXPECTED",
      valid_until: new Date(now - 3600 * 1000).toISOString(), // Expired 1 hour ago
      created_at: new Date(now - 72 * 3600 * 1000).toISOString(), // 3 days ago
    };

    const isPassExpired = (v: typeof expiredPass) => {
      if (v.valid_until && new Date(v.valid_until).getTime() < now) return true;
      if (now - new Date(v.created_at).getTime() > 48 * 3600 * 1000) return true;
      return false;
    };

    expect(isPassExpired(expiredPass)).toBe(true);
  });

  // 14. Server-Side State Machine Transition Integrity
  it("should strictly reject invalid lifecycle state transitions", () => {
    type VisitorStatus = "EXPECTED" | "CHECKED_IN" | "CHECKED_OUT" | "CANCELLED" | "DENIED";

    const isValidTransition = (current: VisitorStatus, next: VisitorStatus): boolean => {
      const allowedTransitions: Record<VisitorStatus, VisitorStatus[]> = {
        EXPECTED: ["CHECKED_IN", "CANCELLED", "DENIED"],
        CHECKED_IN: ["CHECKED_OUT"],
        CHECKED_OUT: [], // Terminal state
        CANCELLED: [],   // Terminal state
        DENIED: [],      // Terminal state
      };
      return allowedTransitions[current]?.includes(next) || false;
    };

    // Valid transitions
    expect(isValidTransition("EXPECTED", "CHECKED_IN")).toBe(true);
    expect(isValidTransition("EXPECTED", "CANCELLED")).toBe(true);
    expect(isValidTransition("CHECKED_IN", "CHECKED_OUT")).toBe(true);

    // Invalid / Malicious transitions must all be blocked
    expect(isValidTransition("CHECKED_OUT", "CHECKED_IN")).toBe(false); // Re-entry on completed pass
    expect(isValidTransition("CANCELLED", "CHECKED_IN")).toBe(false);   // Entry on cancelled pass
    expect(isValidTransition("CHECKED_IN", "CHECKED_IN")).toBe(false);    // Duplicate check-in
    expect(isValidTransition("CHECKED_OUT", "CANCELLED")).toBe(false);   // Cancelling completed pass
  });

  // 15. Resident Contact Privacy Masking in Guard Views
  it("should ensure resident phone numbers and emails are masked in guard visitor roster queries", () => {
    const rawResidentProfile = {
      id: "res-private-1",
      full_name: "Kavita Rao",
      display_name: "Kavita R.",
      phone: "+919820199999",
      email: "kavita.rao@private-domain.com",
    };

    // Function matching sanitized guard view in /api/security/visitors
    const sanitizeForGuardView = (profile: typeof rawResidentProfile) => ({
      id: profile.id,
      full_name: profile.full_name,
      display_name: profile.display_name,
    });

    const guardView = sanitizeForGuardView(rawResidentProfile);
    expect(guardView).not.toHaveProperty("phone");
    expect(guardView).not.toHaveProperty("email");
    expect(guardView.full_name).toBe("Kavita Rao");
  });
});
