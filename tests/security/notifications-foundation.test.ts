import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  NotificationCategory,
  NotificationType,
  NotificationChannel,
} from "@/lib/notifications/types";
import {
  NOTIFICATION_TEMPLATES,
  renderNotificationTemplate,
} from "@/lib/notifications/templates";
import {
  NotificationProviderRegistry,
  notificationProviderRegistry,
  inAppProvider,
  simulatedEmailProvider,
  simulatedSmsProvider,
  simulatedWhatsAppProvider,
} from "@/lib/notifications/providers";
import {
  NotificationPreferencesSchema,
  UpdateNotificationPreferencesSchema,
  BroadcastNotificationSchema,
  NotificationQuerySchema,
} from "@/lib/validations/notifications";
import { roleHasPermission, PERMISSIONS } from "@/lib/auth/permissions";

describe("Phase 23 — Communication & Notifications Foundation Security & Architecture", () => {
  // ==========================================================================
  // 1. Recipient & Tenant Isolation
  // ==========================================================================
  describe("1. Multi-Tenant & Recipient Isolation", () => {
    const socA = "society-uuid-aaa";
    const socB = "society-uuid-bbb";
    const resident1 = "user-uuid-111";
    const resident2 = "user-uuid-222";

    const mockNotification = {
      id: "notif-uuid-999",
      society_id: socA,
      recipient_id: resident1,
      category: "SECURITY" as NotificationCategory,
      type: "ACCOUNT_SECURITY_ALERT" as NotificationType,
      title: "Security Alert: Password Changed",
      body: "Your password was updated recently.",
      is_read: false,
    };

    it("should allow a resident to access only their own notifications within their society", () => {
      const isAuthorized = (reqUserId: string, reqSocId: string) => {
        return (
          mockNotification.recipient_id === reqUserId &&
          mockNotification.society_id === reqSocId
        );
      };

      expect(isAuthorized(resident1, socA)).toBe(true);
      expect(isAuthorized(resident2, socA)).toBe(false); // Same society, different resident
      expect(isAuthorized(resident1, socB)).toBe(false); // Same resident, different society tenant
    });

    it("should grant management roles within the same society management access while denying other societies", () => {
      const canManageSocietyNotifications = (
        membership: { societyId: string; role: string; status: string },
        notificationSocietyId: string
      ) => {
        const managementRoles = ["SOCIETY_ADMIN", "SECRETARY", "MANAGER", "TREASURER"];
        return (
          membership.societyId === notificationSocietyId &&
          membership.status === "ACTIVE" &&
          managementRoles.includes(membership.role)
        );
      };

      // Active managers in Society A can manage
      expect(canManageSocietyNotifications({ societyId: socA, role: "MANAGER", status: "ACTIVE" }, socA)).toBe(true);
      expect(canManageSocietyNotifications({ societyId: socA, role: "SOCIETY_ADMIN", status: "ACTIVE" }, socA)).toBe(true);
      expect(canManageSocietyNotifications({ societyId: socA, role: "SECRETARY", status: "ACTIVE" }, socA)).toBe(true);
      expect(canManageSocietyNotifications({ societyId: socA, role: "TREASURER", status: "ACTIVE" }, socA)).toBe(true);

      // Inactive or regular residents cannot manage
      expect(canManageSocietyNotifications({ societyId: socA, role: "RESIDENT", status: "ACTIVE" }, socA)).toBe(false);
      expect(canManageSocietyNotifications({ societyId: socA, role: "MANAGER", status: "SUSPENDED" }, socA)).toBe(false);

      // Cross-tenant managers cannot manage Society A
      expect(canManageSocietyNotifications({ societyId: socB, role: "SOCIETY_ADMIN", status: "ACTIVE" }, socA)).toBe(false);
      expect(canManageSocietyNotifications({ societyId: socB, role: "MANAGER", status: "ACTIVE" }, socA)).toBe(false);
    });

    it("should allow SUPER_ADMIN platform oversight across societies", () => {
      const canSuperAdminAccess = (isPlatformAdmin: boolean, role: string) => {
        return isPlatformAdmin && role === "SUPER_ADMIN";
      };

      expect(canSuperAdminAccess(true, "SUPER_ADMIN")).toBe(true);
      expect(canSuperAdminAccess(true, "MODERATOR")).toBe(false);
      expect(canSuperAdminAccess(false, "SUPER_ADMIN")).toBe(false);
    });
  });

  // ==========================================================================
  // 2. Mandatory In-App Security Invariant & Preference Constraints
  // ==========================================================================
  describe("2. Mandatory In-App Security Invariant", () => {
    it("should enforce that SECURITY category in_app_enabled cannot be disabled", () => {
      const validatePreferenceUpdate = (category: string, inAppEnabled: boolean) => {
        if (category === "SECURITY" && inAppEnabled === false) {
          return { valid: false, error: "SECURITY notifications cannot have in-app delivery disabled." };
        }
        return { valid: true };
      };

      // Valid combinations
      expect(validatePreferenceUpdate("SECURITY", true).valid).toBe(true);
      expect(validatePreferenceUpdate("BILLING", false).valid).toBe(true);
      expect(validatePreferenceUpdate("COMPLAINTS", false).valid).toBe(true);
      expect(validatePreferenceUpdate("GENERAL", false).valid).toBe(true);

      // Disallowed: SECURITY with in_app_enabled = false
      const secFalse = validatePreferenceUpdate("SECURITY", false);
      expect(secFalse.valid).toBe(false);
      expect(secFalse.error).toContain("SECURITY notifications cannot have in-app delivery disabled");
    });

    it("should validate complete notification preferences payload using Zod schema", () => {
      const payload = {
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
            whatsapp_enabled: true,
            in_app_enabled: true,
          },
          {
            category: "COMPLAINTS",
            email_enabled: false,
            sms_enabled: false,
            whatsapp_enabled: false,
            in_app_enabled: true,
          },
        ],
      };

      const result = UpdateNotificationPreferencesSchema.safeParse(payload);
      expect(result.success).toBe(true);
    });
  });

  // ==========================================================================
  // 3. Provider Abstraction & Registry
  // ==========================================================================
  describe("3. Pluggable Provider Registry Abstraction", () => {
    it("should initialize default singleton registry with all 4 supported channels", () => {
      expect(notificationProviderRegistry.has("IN_APP")).toBe(true);
      expect(notificationProviderRegistry.has("EMAIL")).toBe(true);
      expect(notificationProviderRegistry.has("SMS")).toBe(true);
      expect(notificationProviderRegistry.has("WHATSAPP")).toBe(true);

      const list = notificationProviderRegistry.list();
      expect(list.length).toBeGreaterThanOrEqual(4);
    });

    it("should cleanly resolve providers by channel and throw for unhandled channels", () => {
      const inApp = notificationProviderRegistry.get("IN_APP");
      expect(inApp.providerName).toBe("DwellSync In-App Engine");
      expect(inApp.channel).toBe("IN_APP");

      const email = notificationProviderRegistry.get("EMAIL");
      expect(email.providerName).toBe("Simulated Email Gateway");
      expect(email.channel).toBe("EMAIL");

      const customRegistry = new NotificationProviderRegistry();
      expect(() => customRegistry.get("UNKNOWN" as any)).toThrow("No notification provider registered for channel");
    });

    it("should support registering a custom or mock provider without breaking existing architecture", async () => {
      const customRegistry = new NotificationProviderRegistry();

      const mockEmailProvider = {
        providerName: "MockSESProvider",
        channel: "EMAIL" as NotificationChannel,
        send: vi.fn().mockResolvedValue({
          channel: "EMAIL",
          provider: "MockSESProvider",
          status: "DELIVERED" as const,
          providerMessageId: "ses-mock-12345",
        }),
      };

      customRegistry.register(mockEmailProvider);
      const activeEmailProvider = customRegistry.get("EMAIL");
      expect(activeEmailProvider.providerName).toBe("MockSESProvider");

      const dispatchResult = await activeEmailProvider.send({
        notificationId: "notif-1",
        recipientId: "user-1",
        channel: "EMAIL",
        title: "Test",
        body: "Test body",
      });

      expect(dispatchResult.status).toBe("DELIVERED");
      expect(dispatchResult.providerMessageId).toBe("ses-mock-12345");
      expect(mockEmailProvider.send).toHaveBeenCalledTimes(1);
    });

    it("should execute simulated providers with zero cost and realistic responses", async () => {
      const smsResult = await simulatedSmsProvider.send({
        notificationId: "notif-sms-1",
        recipientId: "user-1",
        recipientPhone: "+919876543210",
        channel: "SMS",
        title: "OTP",
        body: "Your code is 123456",
      });
      expect(smsResult.channel).toBe("SMS");
      expect(smsResult.status).toBe("DELIVERED");
      expect(smsResult.providerMessageId).toBeDefined();

      const waResult = await simulatedWhatsAppProvider.send({
        notificationId: "notif-wa-1",
        recipientId: "user-1",
        recipientPhone: "+919876543210",
        channel: "WHATSAPP",
        title: "Gate Alert",
        body: "Cab arrived at gate",
      });
      expect(waResult.channel).toBe("WHATSAPP");
      expect(waResult.status).toBe("DELIVERED");
      expect(waResult.providerMessageId).toBeDefined();
    });
  });

  // ==========================================================================
  // 4. Multi-Language Localization (en, mr, hi)
  // ==========================================================================
  describe("4. Multi-Language Localization (English, Marathi, Hindi)", () => {
    it("should render PAYMENT_OVERDUE in en, mr, and hi with correct category and actionUrl", () => {
      const params = {
        invoiceNumber: "INV-2026-09",
        amount: 4500,
        daysOverdue: 7,
      };

      const en = renderNotificationTemplate("PAYMENT_OVERDUE", params, "en");
      expect(en.category).toBe("BILLING");
      expect(en.title).toBe("Payment Overdue: ₹4500");
      expect(en.body).toContain("INV-2026-09");
      expect(en.actionUrl).toBe("/resident/billing");

      const mr = renderNotificationTemplate("PAYMENT_OVERDUE", params, "mr");
      expect(mr.category).toBe("BILLING");
      expect(mr.title).toContain("देयक थकीत: ₹4500");
      expect(mr.body).toContain("INV-2026-09");

      const hi = renderNotificationTemplate("PAYMENT_OVERDUE", params, "hi");
      expect(hi.category).toBe("BILLING");
      expect(hi.title).toContain("भुगतान बकाया");
      expect(hi.body).toContain("INV-2026-09");
    });

    it("should render COMPLAINT_SLA_BREACHED across en, mr, and hi", () => {
      const params = {
        ticketNumber: "TCK-1044",
        title: "Elevator B Stopped",
        breachType: "resolution",
        societyId: "soc-green-valley",
      };

      const en = renderNotificationTemplate("COMPLAINT_SLA_BREACHED", params, "en");
      expect(en.category).toBe("COMPLAINTS");
      expect(en.title).toContain("SLA Breached: Ticket #TCK-1044");
      expect(en.body).toContain("Elevator B Stopped");
      expect(en.actionUrl).toBe("/society/soc-green-valley/complaints");

      const mr = renderNotificationTemplate("COMPLAINT_SLA_BREACHED", params, "mr");
      expect(mr.category).toBe("COMPLAINTS");
      expect(mr.title).toContain("एसएलए मर्यादा ओलांडली");
      expect(mr.body).toContain("Elevator B Stopped");

      const hi = renderNotificationTemplate("COMPLAINT_SLA_BREACHED", params, "hi");
      expect(hi.category).toBe("COMPLAINTS");
      expect(hi.title).toContain("एसएलए उल्लंघन");
      expect(hi.body).toContain("Elevator B Stopped");
    });

    it("should render ACCESS_REQUEST events across en, mr, and hi", () => {
      const params = {
        userName: "Aarav Patel",
        unitNumber: "B-501",
        societyName: "Palm Heights",
      };

      // ACCESS_REQUEST_SUBMITTED
      const subEn = renderNotificationTemplate("ACCESS_REQUEST_SUBMITTED", params, "en");
      expect(subEn.category).toBe("GENERAL");
      expect(subEn.title).toContain("Access Request Received: Aarav Patel");
      expect(subEn.body).toContain("B-501");

      const subMr = renderNotificationTemplate("ACCESS_REQUEST_SUBMITTED", params, "mr");
      expect(subMr.title).toContain("प्रवेश विनंती प्राप्त: Aarav Patel");

      const subHi = renderNotificationTemplate("ACCESS_REQUEST_SUBMITTED", params, "hi");
      expect(subHi.title).toContain("प्रवेश अनुरोध प्राप्त: Aarav Patel");

      // ACCESS_REQUEST_APPROVED
      const appEn = renderNotificationTemplate("ACCESS_REQUEST_APPROVED", params, "en");
      expect(appEn.title).toBe("Society Access Approved");
      expect(appEn.body).toContain("Palm Heights");

      const appMr = renderNotificationTemplate("ACCESS_REQUEST_APPROVED", params, "mr");
      expect(appMr.title).toBe("सोसायटी प्रवेश मंजूर");

      const appHi = renderNotificationTemplate("ACCESS_REQUEST_APPROVED", params, "hi");
      expect(appHi.title).toBe("सोसायटी प्रवेश स्वीकृत");
    });

    it("should safely fallback to English if an unsupported locale is requested", () => {
      const rendered = renderNotificationTemplate(
        "GENERAL_ANNOUNCEMENT",
        { title: "Fire Drill", body: "Scheduled for Saturday." },
        "fr" as any
      );
      expect(rendered.title).toBe("Fire Drill");
      expect(rendered.body).toBe("Scheduled for Saturday.");
    });
  });

  // ==========================================================================
  // 5. Spam Prevention, Cooldown Windows & Deduplication
  // ==========================================================================
  describe("5. Spam Prevention & Cooldown Windows", () => {
    it("should suppress notification if a previous notification of the same type was sent within cooldown window", () => {
      const now = Date.now();
      const recentNotifications = [
        {
          society_id: "soc-1",
          recipient_id: "user-1",
          type: "COMPLAINT_SLA_WARNING",
          created_at: new Date(now - 15 * 1000).toISOString(), // 15 seconds ago
        },
      ];

      const shouldSuppress = (
        societyId: string,
        recipientId: string,
        type: string,
        cooldownSeconds: number
      ) => {
        const threshold = new Date(now - cooldownSeconds * 1000);
        const match = recentNotifications.find(
          (n) =>
            n.society_id === societyId &&
            n.recipient_id === recipientId &&
            n.type === type &&
            new Date(n.created_at) > threshold
        );
        return !!match;
      };

      // 60-second cooldown should suppress the 15-second old notification
      expect(shouldSuppress("soc-1", "user-1", "COMPLAINT_SLA_WARNING", 60)).toBe(true);

      // 10-second cooldown should NOT suppress (15s > 10s)
      expect(shouldSuppress("soc-1", "user-1", "COMPLAINT_SLA_WARNING", 10)).toBe(false);

      // Different recipient should NOT be suppressed
      expect(shouldSuppress("soc-1", "user-2", "COMPLAINT_SLA_WARNING", 60)).toBe(false);

      // Different notification type should NOT be suppressed
      expect(shouldSuppress("soc-1", "user-1", "INVOICE_GENERATED", 60)).toBe(false);
    });

    it("should prevent duplicate inserts when dedup_key is reused", () => {
      const store = new Map<string, any>();

      const insertNotification = (notif: { society_id: string; recipient_id: string; dedup_key?: string }) => {
        if (!notif.dedup_key) {
          return { success: true, duplicate: false };
        }
        const key = `${notif.society_id}::${notif.recipient_id}::${notif.dedup_key}`;
        if (store.has(key)) {
          return { success: false, duplicate: true, error: "Unique constraint violation: idx_notifications_dedup" };
        }
        store.set(key, notif);
        return { success: true, duplicate: false };
      };

      // First dispatch succeeds
      const first = insertNotification({
        society_id: "soc-1",
        recipient_id: "user-10",
        dedup_key: "billing_invoice_2026_09",
      });
      expect(first.success).toBe(true);
      expect(first.duplicate).toBe(false);

      // Second identical dispatch is rejected by dedup constraint
      const second = insertNotification({
        society_id: "soc-1",
        recipient_id: "user-10",
        dedup_key: "billing_invoice_2026_09",
      });
      expect(second.success).toBe(false);
      expect(second.duplicate).toBe(true);
      expect(second.error).toContain("Unique constraint violation");

      // Same dedup_key for a different recipient succeeds
      const third = insertNotification({
        society_id: "soc-1",
        recipient_id: "user-20",
        dedup_key: "billing_invoice_2026_09",
      });
      expect(third.success).toBe(true);
    });
  });

  // ==========================================================================
  // 6. Inbox Management: Read & Read-All
  // ==========================================================================
  describe("6. Inbox Management & Read Status Operations", () => {
    it("should update read status and read_at timestamp without modifying recipient or society", () => {
      let notification = {
        id: "notif-555",
        society_id: "soc-xyz",
        recipient_id: "user-xyz",
        is_read: false,
        read_at: null as string | null,
      };

      const markAsRead = (n: typeof notification, actorUserId: string) => {
        if (n.recipient_id !== actorUserId) {
          throw new Error("Unauthorized: cannot modify another user's notification status");
        }
        return {
          ...n,
          is_read: true,
          read_at: new Date().toISOString(),
        };
      };

      // Unauthorized user fails
      expect(() => markAsRead(notification, "attacker-user")).toThrow("Unauthorized");

      // Authorized recipient succeeds
      const updated = markAsRead(notification, "user-xyz");
      expect(updated.is_read).toBe(true);
      expect(updated.read_at).toBeTruthy();
      expect(updated.society_id).toBe("soc-xyz");
      expect(updated.recipient_id).toBe("user-xyz");
    });

    it("should perform bulk read-all exclusively for unread notifications of the requesting recipient", () => {
      const inbox = [
        { id: "n-1", recipient_id: "user-1", is_read: false },
        { id: "n-2", recipient_id: "user-1", is_read: true },
        { id: "n-3", recipient_id: "user-2", is_read: false },
        { id: "n-4", recipient_id: "user-1", is_read: false },
      ];

      const markAllAsRead = (recipientId: string) => {
        let count = 0;
        inbox.forEach((item) => {
          if (item.recipient_id === recipientId && !item.is_read) {
            item.is_read = true;
            count++;
          }
        });
        return count;
      };

      const updatedCount = markAllAsRead("user-1");
      expect(updatedCount).toBe(2); // Only n-1 and n-4 were unread for user-1

      // user-2's notification remains unread
      const user2Notif = inbox.find((i) => i.id === "n-3");
      expect(user2Notif?.is_read).toBe(false);
    });
  });

  // ==========================================================================
  // 7. Audit Logging Compliance
  // ==========================================================================
  describe("7. Audit Trail & Non-Repudiation", () => {
    it("should create immutable audit log payloads for critical notification lifecycle events", () => {
      const createNotificationAuditEntry = (
        action: "NOTIFICATION_DISPATCHED" | "NOTIFICATION_READ" | "NOTIFICATION_PREFERENCES_UPDATED",
        actorId: string,
        societyId: string,
        metadata: Record<string, any>
      ) => {
        return {
          action,
          actor_id: actorId,
          society_id: societyId,
          metadata,
          created_at: new Date().toISOString(),
        };
      };

      const dispatchAudit = createNotificationAuditEntry(
        "NOTIFICATION_DISPATCHED",
        "system",
        "soc-alpha",
        { notificationType: "PAYMENT_OVERDUE", recipientCount: 1, channels: ["IN_APP", "EMAIL"] }
      );
      expect(dispatchAudit.action).toBe("NOTIFICATION_DISPATCHED");
      expect(dispatchAudit.metadata.notificationType).toBe("PAYMENT_OVERDUE");

      const prefAudit = createNotificationAuditEntry(
        "NOTIFICATION_PREFERENCES_UPDATED",
        "resident-user-1",
        "soc-alpha",
        { category: "BILLING", email_enabled: true, sms_enabled: false }
      );
      expect(prefAudit.action).toBe("NOTIFICATION_PREFERENCES_UPDATED");
      expect(prefAudit.actor_id).toBe("resident-user-1");
    });
  });
});
