// DwellSync Notification Domain Types

export type NotificationCategory =
  | "SECURITY"
  | "BILLING"
  | "COMPLAINTS"
  | "NOTICES"
  | "AMENITIES"
  | "EVENTS"
  | "GENERAL";

export type NotificationType =
  // Security & Visitors
  | "VISITOR_INVITED"
  | "VISITOR_APPROVED"
  | "VISITOR_CHECKED_IN"
  | "VISITOR_CHECKED_OUT"
  | "VISITOR_CANCELLED"
  // Complaints & Helpdesk
  | "COMPLAINT_SUBMITTED"
  | "COMPLAINT_ASSIGNED"
  | "COMPLAINT_STATUS_CHANGED"
  | "COMPLAINT_RESOLVED"
  | "COMPLAINT_CLOSED"
  // Maintenance & Billing
  | "INVOICE_GENERATED"
  | "PAYMENT_RECORDED"
  | "RECEIPT_GENERATED"
  // Circulars & Notices
  | "NOTICE_PUBLISHED"
  | "IMPORTANT_NOTICE_PUBLISHED"
  // Community Events
  | "EVENT_PUBLISHED"
  | "EVENT_UPDATED"
  | "EVENT_CANCELLED"
  // Governance & Meetings
  | "MEETING_PUBLISHED"
  | "MEETING_UPDATED"
  | "MEETING_CANCELLED"
  | "MINUTES_PUBLISHED"
  // General & Broadcast
  | "SOCIETY_BROADCAST"
  | "GENERAL_ANNOUNCEMENT";

export type NotificationChannel = "IN_APP" | "EMAIL" | "SMS" | "WHATSAPP";

export type NotificationDeliveryStatus =
  | "QUEUED"
  | "ACCEPTED"
  | "DELIVERED"
  | "FAILED"
  | "RETRYING"
  | "CANCELLED";

export interface SendNotificationParams {
  societyId: string;
  type: NotificationType;
  category?: NotificationCategory;
  unitId?: string; // Auto-resolves all active unit residents
  recipientIds?: string[]; // Authoritative profile UUIDs
  actorId?: string | null;
  data: Record<string, unknown>;
  actionUrl?: string | null;
  dedupKey?: string | null;
  forceInApp?: boolean; // For security-critical alerts
}

export interface SendNotificationResult {
  success: boolean;
  notificationIds: string[];
  recipientCount: number;
  channelsAttempted: NotificationChannel[];
  skippedDueToPreferences?: number;
  error?: string;
}
