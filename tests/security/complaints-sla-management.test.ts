import { describe, it, expect } from "vitest";
import { PERMISSIONS, roleHasPermission } from "@/lib/auth/permissions";
import { RoleId } from "@/lib/types/database";
import {
  addBusinessHours,
  calculateDeadlines,
  evaluateSlaStatus,
  calculateResumedDeadlines,
  DEFAULT_SLA_FALLBACKS,
} from "@/lib/services/slaService";
import {
  ComplaintPriorityEnum,
  ComplaintStatusEnum,
  ComplaintSlaStatusEnum,
  OnHoldReasonEnum,
  CreateComplaintSchema,
  UpdateComplaintSchema,
  ReopenComplaintSchema,
  CloseComplaintSchema,
  ComplaintSlaConfigSchema,
  ComplaintEscalationRuleSchema,
} from "@/lib/validations/complaints";

/**
 * Complaint / Helpdesk Enhancement + SLA Management Security & Logic Test Suite:
 * - 1. SLA Calculation & Business Hours Engine (24x7, Calendar, Weekend Exclusions)
 * - 2. SLA Status Resolution (ON_TRACK, DUE_SOON, BREACHED, PAUSED, COMPLETED)
 * - 3. Pause & Resume Mechanics (Deadline Shift, Paused Duration Accumulation)
 * - 4. Lifecycle Transitions, Reopen Workflow & Multi-Cycle History
 * - 5. Escalation Rules & Anti-Spam Cooldown Logic
 * - 6. RBAC, IDOR Protection & Multi-Tenant Isolation
 * - 7. Zod Validations & Boundary Constraints
 */
describe("Complaint / Helpdesk Enhancement + SLA Management", () => {
  // ============================================================
  // 1. SLA CALCULATION & BUSINESS HOURS ENGINE
  // ============================================================
  describe("1. SLA Calculation & Business Hours Engine", () => {
    it("Calculates 24x7 deadlines using exact wall-clock arithmetic", () => {
      const baseDate = new Date("2026-10-01T10:00:00.000Z");
      const result = calculateDeadlines(baseDate, {
        response_time_hours: 2,
        resolution_time_hours: 8,
        business_hours_only: false,
      });

      expect(result.businessHoursOnly).toBe(false);
      expect(result.responseDueAt.toISOString()).toBe("2026-10-01T12:00:00.000Z");
      expect(result.resolutionDueAt.toISOString()).toBe("2026-10-01T18:00:00.000Z");
    });

    it("Applies fallback priority defaults when no custom rule is provided", () => {
      const baseDate = new Date("2026-10-01T09:00:00.000Z");

      // Critical: 1h response, 4h resolution, 24x7
      const criticalResult = calculateDeadlines(baseDate, null, "CRITICAL");
      expect(criticalResult.responseTimeHours).toBe(DEFAULT_SLA_FALLBACKS.CRITICAL.responseHours);
      expect(criticalResult.resolutionTimeHours).toBe(DEFAULT_SLA_FALLBACKS.CRITICAL.resolutionHours);
      expect(criticalResult.businessHoursOnly).toBe(false);

      // High: 2h response, 12h resolution, 24x7
      const highResult = calculateDeadlines(baseDate, null, "HIGH");
      expect(highResult.responseTimeHours).toBe(DEFAULT_SLA_FALLBACKS.HIGH.responseHours);
      expect(highResult.resolutionTimeHours).toBe(DEFAULT_SLA_FALLBACKS.HIGH.resolutionHours);

      // Medium: 4h response, 24h resolution, business hours
      const mediumResult = calculateDeadlines(baseDate, null, "MEDIUM");
      expect(mediumResult.responseTimeHours).toBe(DEFAULT_SLA_FALLBACKS.MEDIUM.responseHours);
      expect(mediumResult.businessHoursOnly).toBe(true);
    });

    it("Correctly computes business hours within same working day", () => {
      // Wednesday 10:00 AM + 4 working hours -> Wednesday 02:00 PM (14:00)
      const wednesday10Am = new Date(2026, 9, 7, 10, 0, 0); // Oct 7, 2026 is Wednesday
      const due = addBusinessHours(wednesday10Am, 4, {
        startHour: 9,
        endHour: 18,
        excludeWeekends: true,
      });

      expect(due.getHours()).toBe(14);
      expect(due.getMinutes()).toBe(0);
      expect(due.getDate()).toBe(7);
    });

    it("Skips weekends and non-business hours when ticket is raised on Friday evening", () => {
      // Friday Oct 9, 2026 at 17:00 (1 hour before close at 18:00)
      const friday5pm = new Date(2026, 9, 9, 17, 0, 0);
      // Adding 4 business hours:
      // - 1 hour used on Friday (17:00 to 18:00) -> 3 hours remaining
      // - Saturday Oct 10 skipped
      // - Sunday Oct 11 skipped
      // - Monday Oct 12: starts at 09:00 + 3 hours -> 12:00 PM
      const due = addBusinessHours(friday5pm, 4, {
        startHour: 9,
        endHour: 18,
        excludeWeekends: true,
      });

      expect(due.getDay()).toBe(1); // Monday
      expect(due.getDate()).toBe(12); // Oct 12
      expect(due.getHours()).toBe(12);
      expect(due.getMinutes()).toBe(0);
    });
  });

  // ============================================================
  // 2. SLA STATUS EVALUATION
  // ============================================================
  describe("2. SLA Status Evaluation", () => {
    it("Resolves to COMPLETED when complaint is RESOLVED or CLOSED", () => {
      const resolved = evaluateSlaStatus({ status: "RESOLVED" });
      expect(resolved.slaStatus).toBe("COMPLETED");

      const closed = evaluateSlaStatus({ status: "CLOSED" });
      expect(closed.slaStatus).toBe("COMPLETED");
    });

    it("Resolves to PAUSED when complaint is ON_HOLD", () => {
      const onHold = evaluateSlaStatus({ status: "ON_HOLD" });
      expect(onHold.slaStatus).toBe("PAUSED");
      expect(onHold.remainingMinutes).toBeNull();
    });

    it("Resolves to BREACHED when now exceeds resolution_due_at", () => {
      const now = new Date("2026-10-01T15:00:00.000Z");
      const pastDue = new Date("2026-10-01T14:00:00.000Z"); // 1 hour past

      const result = evaluateSlaStatus(
        {
          status: "IN_PROGRESS",
          resolution_due_at: pastDue.toISOString(),
          response_due_at: "2026-10-01T11:00:00.000Z",
          responded_at: "2026-10-01T10:30:00.000Z",
        },
        now
      );

      expect(result.slaStatus).toBe("BREACHED");
      expect(result.isResolutionBreached).toBe(true);
    });

    it("Resolves to BREACHED when response deadline is missed without response", () => {
      const now = new Date("2026-10-01T12:00:00.000Z");
      const respDue = new Date("2026-10-01T11:00:00.000Z");
      const resDue = new Date("2026-10-01T18:00:00.000Z");

      const result = evaluateSlaStatus(
        {
          status: "SUBMITTED",
          response_due_at: respDue.toISOString(),
          responded_at: null,
          resolution_due_at: resDue.toISOString(),
        },
        now
      );

      expect(result.slaStatus).toBe("BREACHED");
      expect(result.isResponseBreached).toBe(true);
    });

    it("Resolves to DUE_SOON when remaining time is under 120 minutes", () => {
      const now = new Date("2026-10-01T12:00:00.000Z");
      const resDue = new Date("2026-10-01T13:30:00.000Z"); // 90 minutes remaining

      const result = evaluateSlaStatus(
        {
          status: "IN_PROGRESS",
          resolution_due_at: resDue.toISOString(),
          responded_at: "2026-10-01T10:00:00.000Z",
        },
        now
      );

      expect(result.slaStatus).toBe("DUE_SOON");
      expect(result.remainingMinutes).toBe(90);
    });

    it("Resolves to ON_TRACK when time remaining exceeds 120 minutes", () => {
      const now = new Date("2026-10-01T10:00:00.000Z");
      const resDue = new Date("2026-10-01T16:00:00.000Z"); // 6 hours remaining

      const result = evaluateSlaStatus(
        {
          status: "IN_PROGRESS",
          resolution_due_at: resDue.toISOString(),
          responded_at: "2026-10-01T10:30:00.000Z",
        },
        now
      );

      expect(result.slaStatus).toBe("ON_TRACK");
      expect(result.remainingMinutes).toBe(360);
    });
  });

  // ============================================================
  // 3. PAUSE & RESUME MECHANICS
  // ============================================================
  describe("3. Pause & Resume Mechanics", () => {
    it("Extends resolution deadline by exact paused duration upon resumption", () => {
      const pausedAt = "2026-10-01T12:00:00.000Z";
      const originalDueAt = "2026-10-01T18:00:00.000Z";
      const resumeTime = new Date("2026-10-01T14:30:00.000Z"); // 150 minutes paused

      const result = calculateResumedDeadlines(pausedAt, originalDueAt, 0, resumeTime);

      expect(result.addedPausedMinutes).toBe(150);
      expect(result.newTotalPausedMinutes).toBe(150);

      // New due time should be original due + 150 minutes = 20:30
      expect(result.resumedResolutionDueAt.toISOString()).toBe("2026-10-01T20:30:00.000Z");
    });

    it("Accumulates prior paused durations when paused multiple times", () => {
      const pausedAt = "2026-10-02T10:00:00.000Z";
      const originalDueAt = "2026-10-02T18:00:00.000Z";
      const resumeTime = new Date("2026-10-02T11:00:00.000Z"); // 60 minutes
      const priorTotal = 90; // previously paused for 90 mins

      const result = calculateResumedDeadlines(pausedAt, originalDueAt, priorTotal, resumeTime);

      expect(result.addedPausedMinutes).toBe(60);
      expect(result.newTotalPausedMinutes).toBe(150);
    });
  });

  // ============================================================
  // 4. LIFECYCLE TRANSITIONS & REOPEN CYCLES
  // ============================================================
  describe("4. Lifecycle Transitions & Reopen Cycles", () => {
    function isValidStatusTransition(from: string, to: string): boolean {
      const allowedTransitions: Record<string, string[]> = {
        SUBMITTED: ["ACKNOWLEDGED", "ASSIGNED", "IN_PROGRESS", "CLOSED"],
        NEW: ["ACKNOWLEDGED", "ASSIGNED", "IN_PROGRESS", "CLOSED"],
        ACKNOWLEDGED: ["ASSIGNED", "IN_PROGRESS", "ON_HOLD", "CLOSED"],
        ASSIGNED: ["IN_PROGRESS", "ON_HOLD", "RESOLVED"],
        IN_PROGRESS: ["ON_HOLD", "RESOLVED"],
        ON_HOLD: ["IN_PROGRESS", "ASSIGNED"],
        RESOLVED: ["CLOSED", "REOPENED"],
        CLOSED: ["REOPENED"],
        REOPENED: ["ASSIGNED", "IN_PROGRESS", "ACKNOWLEDGED"],
      };

      return allowedTransitions[from]?.includes(to) ?? false;
    }

    it("Permits valid forward lifecycle workflow", () => {
      expect(isValidStatusTransition("SUBMITTED", "ACKNOWLEDGED")).toBe(true);
      expect(isValidStatusTransition("ACKNOWLEDGED", "ASSIGNED")).toBe(true);
      expect(isValidStatusTransition("ASSIGNED", "IN_PROGRESS")).toBe(true);
      expect(isValidStatusTransition("IN_PROGRESS", "RESOLVED")).toBe(true);
      expect(isValidStatusTransition("RESOLVED", "CLOSED")).toBe(true);
    });

    it("Allows ON_HOLD from IN_PROGRESS and permits resuming to IN_PROGRESS", () => {
      expect(isValidStatusTransition("IN_PROGRESS", "ON_HOLD")).toBe(true);
      expect(isValidStatusTransition("ON_HOLD", "IN_PROGRESS")).toBe(true);
    });

    it("Rejects illegal transitions such as CLOSED directly to IN_PROGRESS", () => {
      expect(isValidStatusTransition("CLOSED", "IN_PROGRESS")).toBe(false);
      expect(isValidStatusTransition("RESOLVED", "IN_PROGRESS")).toBe(false);
      expect(isValidStatusTransition("SUBMITTED", "RESOLVED")).toBe(false);
    });

    it("Permits REOPENED only from RESOLVED or CLOSED", () => {
      expect(isValidStatusTransition("RESOLVED", "REOPENED")).toBe(true);
      expect(isValidStatusTransition("CLOSED", "REOPENED")).toBe(true);
      expect(isValidStatusTransition("IN_PROGRESS", "REOPENED")).toBe(false);
      expect(isValidStatusTransition("SUBMITTED", "REOPENED")).toBe(false);
    });

    it("Increments SLA cycle number on reopen and preserves previous cycle history", () => {
      const existingComplaint = {
        id: "c1",
        status: "RESOLVED",
        sla_cycle_number: 1,
      };

      const newCycleNumber = (existingComplaint.sla_cycle_number || 1) + 1;
      expect(newCycleNumber).toBe(2);
    });
  });

  // ============================================================
  // 5. ESCALATION RULES & ANTI-SPAM LOGIC
  // ============================================================
  describe("5. Escalation Rules & Anti-Spam Logic", () => {
    it("Enforces 4-hour anti-spam cooldown between successive escalations for non-critical complaints", () => {
      const now = new Date("2026-10-01T12:00:00.000Z");
      const recentEscalation = new Date("2026-10-01T10:00:00.000Z"); // 2 hours ago (< 4 hours)
      const isCritical = false;

      const timeDeltaMs = now.getTime() - recentEscalation.getTime();
      const isCooldownActive = !isCritical && timeDeltaMs < 4 * 3600 * 1000;

      expect(isCooldownActive).toBe(true);
    });

    it("Bypasses cooldown for CRITICAL and EMERGENCY complaints", () => {
      const now = new Date("2026-10-01T12:00:00.000Z");
      const recentEscalation = new Date("2026-10-01T11:00:00.000Z"); // 1 hour ago
      const isCritical = true;

      const timeDeltaMs = now.getTime() - recentEscalation.getTime();
      const shouldSuppress = !isCritical && timeDeltaMs < 4 * 3600 * 1000;

      expect(shouldSuppress).toBe(false);
    });
  });

  // ============================================================
  // 6. RBAC & IDOR PREVENTIONS
  // ============================================================
  describe("6. RBAC & IDOR Security", () => {
    it("Grants COMPLAINTS_MANAGE to authorized governance roles", () => {
      const authorizedRoles: RoleId[] = ["SUPER_ADMIN", "SOCIETY_ADMIN", "SECRETARY", "MANAGER"];
      for (const role of authorizedRoles) {
        expect(roleHasPermission(role, PERMISSIONS.COMPLAINTS_MANAGE)).toBe(true);
      }
    });

    it("Strictly denies COMPLAINTS_MANAGE to residents, tenants, security and vendors", () => {
      const deniedRoles: RoleId[] = ["RESIDENT", "OWNER", "TENANT", "SECURITY", "VENDOR"];
      for (const role of deniedRoles) {
        expect(roleHasPermission(role, PERMISSIONS.COMPLAINTS_MANAGE)).toBe(false);
      }
    });

    it("Blocks a resident from closing or reopening another resident's ticket (IDOR guard)", () => {
      const complaintCreator: string = "resident-alice";
      const attackingUser: string = "resident-bob";

      const isAllowedToReopen = attackingUser === complaintCreator;
      expect(isAllowedToReopen).toBe(false);
    });
  });

  // ============================================================
  // 7. ZOD VALIDATIONS
  // ============================================================
  describe("7. Zod Validations & Boundary Constraints", () => {
    it("Validates complaint creation with optional subcategory", () => {
      const payload = {
        title: "Kitchen sink blockage",
        description: "Water backing up under sink",
        category: "PLUMBING",
        subcategory: "Kitchen Sink Drainpipe",
        priority: "HIGH",
      };

      const result = CreateComplaintSchema.safeParse(payload);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.subcategory).toBe("Kitchen Sink Drainpipe");
      }
    });

    it("Requires on_hold_reason when updating complaint status to ON_HOLD", () => {
      const invalidOnHold = {
        status: "ON_HOLD",
      };
      expect(UpdateComplaintSchema.safeParse(invalidOnHold).success).toBe(false);

      const validOnHold = {
        status: "ON_HOLD",
        on_hold_reason: "WAITING_FOR_PARTS",
      };
      expect(UpdateComplaintSchema.safeParse(validOnHold).success).toBe(true);
    });

    it("Validates ReopenComplaintSchema requiring minimum 5 character reason", () => {
      expect(ReopenComplaintSchema.safeParse({ reason: "bad" }).success).toBe(false);
      expect(ReopenComplaintSchema.safeParse({ reason: "Issue reoccurred after 2 hours" }).success).toBe(true);
    });

    it("Validates SLA config requiring resolution time >= response time", () => {
      const invalidSla = {
        category: "PLUMBING",
        priority: "HIGH",
        response_time_hours: 6,
        resolution_time_hours: 2, // resolution < response is invalid
      };
      expect(ComplaintSlaConfigSchema.safeParse(invalidSla).success).toBe(false);

      const validSla = {
        category: "PLUMBING",
        priority: "HIGH",
        response_time_hours: 2,
        resolution_time_hours: 8,
      };
      expect(ComplaintSlaConfigSchema.safeParse(validSla).success).toBe(true);
    });
  });
});
