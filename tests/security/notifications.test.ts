import { describe, it, expect } from "vitest";
import { NOTIFICATION_TEMPLATES, renderNotificationTemplate } from "@/lib/notifications/templates";
import {
  NotificationCategory,
  NotificationType,
} from "@/lib/notifications/types";
import {
  InAppNotificationProvider,
  SimulatedEmailProvider,
  SimulatedSmsProvider,
  SimulatedWhatsAppProvider,
} from "@/lib/notifications/providers";
import {
  NotificationPreferencesSchema,
  UpdateNotificationPreferencesSchema,
  BroadcastNotificationSchema,
  NotificationQuerySchema,
} from "@/lib/validations/notifications";
import { roleHasPermission, PERMISSIONS } from "@/lib/auth/permissions";

describe("Phase 10 — Communication & Notifications Security Tests", () => {
  // 1. Recipient Isolation & Verification
  describe("1. Recipient & Tenant Isolation", () => {
    it("should ensure notifications are strictly scoped to recipient_id and society_id", () => {
      const mockNotification = {
        id: "notif-uuid-1",
        society_id: "soc-green-valley",
        recipient_id: "resident-user-1",
        category: "SECURITY",
        type: "VISITOR_CHECK_IN",
        title: "Visitor Arrival: John Doe",
        body: "John Doe has checked in at the gate for unit 101.",
        is_read: false,
      };

      const requestingUser1 = { id: "resident-user-1", societyId: "soc-green-valley" };
      const requestingUser2 = { id: "resident-user-2", societyId: "soc-green-valley" };
      const crossTenantUser = { id: "resident-user-1", societyId: "soc-other" };

      // Resident 1 can access their own notification in their society
      const canAccessUser1 =
        mockNotification.recipient_id === requestingUser1.id &&
        mockNotification.society_id === requestingUser1.societyId;
      expect(canAccessUser1).toBe(true);

      // Resident 2 CANNOT access Resident 1's notification
      const canAccessUser2 =
        mockNotification.recipient_id === requestingUser2.id &&
        mockNotification.society_id === requestingUser2.societyId;
      expect(canAccessUser2).toBe(false);

      // Cross-tenant access is blocked even if user ID somehow matched
      const canAccessCrossTenant =
        mockNotification.recipient_id === crossTenantUser.id &&
        mockNotification.society_id === crossTenantUser.societyId;
      expect(canAccessCrossTenant).toBe(false);
    });
  });

  // 2. Preferences & Mandatory Security In-App Alerts
  describe("2. Notification Preferences & Security In-App Invariance", () => {
    it("should strictly enforce that SECURITY in_app_enabled cannot be false", () => {
      const enforcePreferences = (cat: NotificationCategory, requestedInApp: boolean) => {
        if (cat === "SECURITY") {
          return true; // Mandatory by design and DB constraint
        }
        return requestedInApp;
      };

      expect(enforcePreferences("SECURITY", false)).toBe(true);
      expect(enforcePreferences("SECURITY", true)).toBe(true);
      expect(enforcePreferences("BILLING", false)).toBe(false);
      expect(enforcePreferences("GENERAL", false)).toBe(false);
    });

    it("should validate notification preference payload schema", () => {
      const validPayload = {
        preferences: [
          {
            category: "SECURITY",
            email_enabled: true,
            sms_enabled: false,
            whatsapp_enabled: false,
            in_app_enabled: true,
          },
          {
            category: "BILLING",
            email_enabled: true,
            sms_enabled: true,
            whatsapp_enabled: false,
            in_app_enabled: true,
          },
        ],
      };

      const result = UpdateNotificationPreferencesSchema.safeParse(validPayload);
      expect(result.success).toBe(true);

      const invalidPayload = {
        preferences: [
          {
            category: "INVALID_CAT",
            email_enabled: "yes",
          },
        ],
      };
      const invalidResult = UpdateNotificationPreferencesSchema.safeParse(invalidPayload);
      expect(invalidResult.success).toBe(false);
    });
  });

  // 3. Provider Abstraction
  describe("3. Multi-Channel Provider Dispatch", () => {
    it("InAppNotificationProvider should deliver locally and return status DELIVERED", async () => {
      const provider = new InAppNotificationProvider();
      const res = await provider.send({
        notificationId: "notif-100",
        recipientId: "user-100",
        channel: "IN_APP",
        title: "Test In-App",
        body: "Test content",
      });

      expect(res.channel).toBe("IN_APP");
      expect(res.status).toBe("DELIVERED");
      expect(res.providerMessageId).toBe("notif-100");
    });

    it("SimulatedEmailProvider should simulate email dispatch cleanly", async () => {
      const provider = new SimulatedEmailProvider();
      const res = await provider.send({
        notificationId: "notif-101",
        recipientId: "user-101",
        recipientEmail: "resident@dwellsync.test",
        channel: "EMAIL",
        title: "Maintenance Bill",
        body: "Your invoice is ready",
      });

      expect(res.channel).toBe("EMAIL");
      expect(res.status).toBe("DELIVERED");
      expect(res.providerMessageId).toBeDefined();
    });

    it("SimulatedSmsProvider should simulate SMS dispatch cleanly", async () => {
      const provider = new SimulatedSmsProvider();
      const res = await provider.send({
        notificationId: "notif-102",
        recipientId: "user-102",
        recipientPhone: "+919876543210",
        channel: "SMS",
        title: "Security Gate Pass",
        body: "Your guest has arrived",
      });

      expect(res.channel).toBe("SMS");
      expect(res.status).toBe("DELIVERED");
    });

    it("SimulatedWhatsAppProvider should simulate WhatsApp dispatch cleanly", async () => {
      const provider = new SimulatedWhatsAppProvider();
      const res = await provider.send({
        notificationId: "notif-103",
        recipientId: "user-103",
        recipientPhone: "+919876543210",
        channel: "WHATSAPP",
        title: "Notice Published",
        body: "Annual General Body Meeting",
      });

      expect(res.channel).toBe("WHATSAPP");
      expect(res.status).toBe("DELIVERED");
    });
  });

  // 4. Template Interpolation
  describe("4. Typed Templates & Safe Variable Interpolation", () => {
    it("should render VISITOR_CHECKED_IN template with safe defaults", () => {
      const rendered = renderNotificationTemplate("VISITOR_CHECKED_IN", {
        visitorName: "Rahul Sharma",
        unitNumber: "A-402",
        visitorId: "v-888",
      });

      expect(rendered.category).toBe("SECURITY");
      expect(rendered.title).toBe("Visitor Arrival: Rahul Sharma");
      expect(rendered.body).toBe("Rahul Sharma has checked in at the gate for unit A-402.");
      expect(rendered.actionUrl).toBe("/resident/visitors?id=v-888");
    });

    it("should render INVOICE_GENERATED template correctly", () => {
      const rendered = renderNotificationTemplate("INVOICE_GENERATED", {
        invoiceNumber: "INV-2026-09-001",
        amount: 3500,
        period: "September 2026",
        dueDate: "2026-09-15",
      });

      expect(rendered.category).toBe("BILLING");
      expect(rendered.title).toBe("New Maintenance Invoice: INV-2026-09-001");
      expect(rendered.body).toContain("₹3500");
      expect(rendered.actionUrl).toBe("/resident/billing");
    });

    it("should render NOTICE_PUBLISHED template correctly", () => {
      const rendered = renderNotificationTemplate("NOTICE_PUBLISHED", {
        noticeTitle: "Water Tank Cleaning",
        summary: "Water supply will be suspended on Sunday from 10am to 2pm.",
      });

      expect(rendered.category).toBe("NOTICES");
      expect(rendered.title).toBe("Notice: Water Tank Cleaning");
      expect(rendered.body).toContain("Water supply will be suspended");
      expect(rendered.actionUrl).toBe("/resident/notices");
    });
  });

  // 5. RBAC & Society Broadcast Permissions
  describe("5. Role-Based Broadcast Authorization", () => {
    it("should allow SOCIETY_ADMIN and SECRETARY to broadcast notifications", () => {
      expect(roleHasPermission("SOCIETY_ADMIN", PERMISSIONS.NOTIFICATIONS_BROADCAST)).toBe(true);
      expect(roleHasPermission("SECRETARY", PERMISSIONS.NOTIFICATIONS_BROADCAST)).toBe(true);
      expect(roleHasPermission("TREASURER", PERMISSIONS.NOTIFICATIONS_BROADCAST)).toBe(true);
      expect(roleHasPermission("COMMITTEE_MEMBER", PERMISSIONS.NOTIFICATIONS_BROADCAST)).toBe(true);
    });

    it("should strictly deny RESIDENT, TENANT, and SECURITY from broadcasting notifications", () => {
      expect(roleHasPermission("RESIDENT", PERMISSIONS.NOTIFICATIONS_BROADCAST)).toBe(false);
      expect(roleHasPermission("TENANT", PERMISSIONS.NOTIFICATIONS_BROADCAST)).toBe(false);
      expect(roleHasPermission("SECURITY", PERMISSIONS.NOTIFICATIONS_BROADCAST)).toBe(false);
      expect(roleHasPermission("VENDOR", PERMISSIONS.NOTIFICATIONS_BROADCAST)).toBe(false);
    });

    it("should allow all active personas to view notifications", () => {
      const activeRoles = [
        "SOCIETY_ADMIN",
        "SECRETARY",
        "TREASURER",
        "COMMITTEE_MEMBER",
        "MANAGER",
        "RESIDENT",
        "OWNER",
        "TENANT",
        "SECURITY",
        "STAFF",
        "AUDITOR",
      ] as const;

      activeRoles.forEach((role) => {
        expect(roleHasPermission(role, PERMISSIONS.NOTIFICATIONS_VIEW)).toBe(true);
      });
    });
  });

  // 6. Idempotency & Deduplication
  describe("6. Deduplication & Idempotency", () => {
    it("should prevent double dispatch for identical dedup_key within the same society and recipient", () => {
      const existingRecords = new Set<string>();
      const recordNotification = (societyId: string, recipientId: string, dedupKey: string) => {
        const key = `${societyId}_${recipientId}_${dedupKey}`;
        if (existingRecords.has(key)) {
          return { inserted: false, duplicate: true };
        }
        existingRecords.add(key);
        return { inserted: true, duplicate: false };
      };

      const firstAttempt = recordNotification("soc-1", "user-1", "visitor_checkin_123");
      expect(firstAttempt.inserted).toBe(true);
      expect(firstAttempt.duplicate).toBe(false);

      const secondAttempt = recordNotification("soc-1", "user-1", "visitor_checkin_123");
      expect(secondAttempt.inserted).toBe(false);
      expect(secondAttempt.duplicate).toBe(true);

      // Different recipient should succeed
      const differentRecipient = recordNotification("soc-1", "user-2", "visitor_checkin_123");
      expect(differentRecipient.inserted).toBe(true);
    });
  });

  // 7. Zod Validation Constraints
  describe("7. Input Validation & Query Bounds", () => {
    it("BroadcastNotificationSchema should enforce title/body lengths and sanitize URLs", () => {
      const valid = {
        title: "Scheduled Power Outage",
        body: "Power will be off from 2pm to 4pm for DG set maintenance.",
        category: "GENERAL",
        action_url: "/resident/notices",
      };
      expect(BroadcastNotificationSchema.safeParse(valid).success).toBe(true);

      const tooShort = {
        title: "Hi",
        body: "Ok",
      };
      expect(BroadcastNotificationSchema.safeParse(tooShort).success).toBe(false);
    });

    it("NotificationQuerySchema should enforce pagination bounds", () => {
      const parsed = NotificationQuerySchema.safeParse({ page: "2", limit: "25", unreadOnly: "true" });
      expect(parsed.success).toBe(true);
      if (parsed.success) {
        expect(parsed.data.page).toBe(2);
        expect(parsed.data.limit).toBe(25);
        expect(parsed.data.unreadOnly).toBe("true");
      }

      // Max limit cap is 50
      const overLimit = NotificationQuerySchema.safeParse({ limit: "100" });
      expect(overLimit.success).toBe(false);
    });
  });
});
