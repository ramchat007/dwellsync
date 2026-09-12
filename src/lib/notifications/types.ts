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
  | "COMPLAINT_REOPENED"
  | "COMPLAINT_SLA_WARNING"
  | "COMPLAINT_SLA_BREACHED"
  | "COMPLAINT_ESCALATED"
  // Maintenance & Billing
  | "INVOICE_GENERATED"
  | "PAYMENT_RECORDED"
  | "RECEIPT_GENERATED"
  | "PAYMENT_OVERDUE"
  | "BILLING_CYCLE_STARTED"
  // Circulars & Notices
  | "NOTICE_PUBLISHED"
  | "IMPORTANT_NOTICE_PUBLISHED"
  // Community Events & Polls
  | "EVENT_PUBLISHED"
  | "EVENT_UPDATED"
  | "EVENT_CANCELLED"
  | "EVENT_REMINDER"
  | "POLL_PUBLISHED"
  | "POLL_REMINDER_CLOSING"
  | "POLL_CLOSED_RESULTS"
  // Governance & Meetings
  | "MEETING_PUBLISHED"
  | "MEETING_SCHEDULED"
  | "MEETING_UPDATED"
  | "MEETING_CANCELLED"
  | "MINUTES_PUBLISHED"
  | "ACTION_ITEM_ASSIGNED"
  | "COMMITTEE_APPOINTED"
  | "COMMITTEE_MEMBER_REMOVED"
  | "COMMITTEE_MEMBER_RESIGNED"
  | "COMMITTEE_DESIGNATION_CHANGED"
  // System & Access Alerts
  | "SYSTEM_ALERT"
  | "ACCOUNT_SECURITY_ALERT"
  | "ACCESS_REQUEST_SUBMITTED"
  | "ACCESS_REQUEST_APPROVED"
  | "ACCESS_REQUEST_REJECTED"
  // General & Broadcast
  | "SOCIETY_BROADCAST"
  | "GENERAL_ANNOUNCEMENT"
  // Phase 13 Handover
  | "HANDOVER_CHECKLIST_ASSIGNED"
  | "HANDOVER_CHECKLIST_OVERDUE"
  | "HANDOVER_DEFECT_ASSIGNED"
  | "HANDOVER_COMMITMENT_OVERDUE"
  | "HANDOVER_READY_FOR_ACCEPTANCE"
  // Document Management
  | "DOCUMENT_PUBLISHED"
  | "DOCUMENT_APPROVED"
  | "DOCUMENT_REVIEW_REQUESTED";

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
  cooldownSeconds?: number; // Spam prevention cooldown window in seconds
}

export interface SendNotificationResult {
  success: boolean;
  notificationIds: string[];
  recipientCount: number;
  channelsAttempted: NotificationChannel[];
  skippedDueToPreferences?: number;
  error?: string;
}
