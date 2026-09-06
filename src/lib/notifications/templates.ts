import { NotificationType, NotificationCategory } from './types';

export interface NotificationTemplateDefinition {
  category: NotificationCategory;
  titleTemplate: (params: Record<string, any>) => string;
  bodyTemplate: (params: Record<string, any>) => string;
  actionUrlTemplate?: (params: Record<string, any>) => string;
}

export const NOTIFICATION_TEMPLATES: Record<NotificationType, NotificationTemplateDefinition> = {
  // Security & Visitors
  VISITOR_INVITED: {
    category: 'SECURITY',
    titleTemplate: (p: Record<string, any>) => 'Pass Code Generated: ' + (p.visitorName || 'Visitor'),
    bodyTemplate: (p: Record<string, any>) => 'Pre-approved pass code ' + (p.passCode || '') + ' created for ' + (p.visitorName || 'your visitor') + '.',
    actionUrlTemplate: () => '/resident/visitors',
  },
  VISITOR_APPROVED: {
    category: 'SECURITY',
    titleTemplate: (p: Record<string, any>) => 'Visitor Approved: ' + (p.visitorName || 'Visitor'),
    bodyTemplate: (p: Record<string, any>) => (p.visitorName || 'Visitor') + ' has been approved for gate entry.',
    actionUrlTemplate: () => '/resident/visitors',
  },
  VISITOR_CHECKED_IN: {
    category: 'SECURITY',
    titleTemplate: (p: Record<string, any>) => 'Visitor Arrival: ' + (p.visitorName || 'Visitor'),
    bodyTemplate: (p: Record<string, any>) => (p.visitorName || 'A visitor') + ' has checked in at the gate for unit ' + (p.unitNumber || '') + '.',
    actionUrlTemplate: (p: Record<string, any>) => p.visitorId ? '/resident/visitors?id=' + p.visitorId : '/resident/visitors',
  },
  VISITOR_CHECKED_OUT: {
    category: 'SECURITY',
    titleTemplate: (p: Record<string, any>) => 'Visitor Departed: ' + (p.visitorName || 'Visitor'),
    bodyTemplate: (p: Record<string, any>) => (p.visitorName || 'Your visitor') + ' has checked out at the gate.',
    actionUrlTemplate: () => '/resident/visitors',
  },
  VISITOR_CANCELLED: {
    category: 'SECURITY',
    titleTemplate: (p: Record<string, any>) => 'Visitor Cancelled: ' + (p.visitorName || 'Visitor'),
    bodyTemplate: (p: Record<string, any>) => 'Pass for ' + (p.visitorName || 'visitor') + ' has been cancelled.',
    actionUrlTemplate: () => '/resident/visitors',
  },

  // Complaints & Helpdesk
  COMPLAINT_SUBMITTED: {
    category: 'COMPLAINTS',
    titleTemplate: (p) => 'Complaint Submitted: #' + (p.ticketNumber || p.complaintId || ''),
    bodyTemplate: (p) => 'Your complaint "' + (p.title || 'Support Request') + '" has been logged.',
    actionUrlTemplate: (p) => '/resident/complaints?id=' + (p.complaintId || ''),
  },
  COMPLAINT_ASSIGNED: {
    category: 'COMPLAINTS',
    titleTemplate: (p) => 'Complaint Assigned: #' + (p.ticketNumber || p.complaintId || ''),
    bodyTemplate: (p) => 'Your ticket has been assigned to ' + (p.assignedTo || 'a technician') + '.',
    actionUrlTemplate: (p) => '/resident/complaints?id=' + (p.complaintId || ''),
  },
  COMPLAINT_STATUS_CHANGED: {
    category: 'COMPLAINTS',
    titleTemplate: (p) => 'Complaint Status: #' + (p.ticketNumber || p.complaintId || ''),
    bodyTemplate: (p) => 'Status updated to ' + (p.status || 'Updated') + (p.remarks ? '. ' + p.remarks : ''),
    actionUrlTemplate: (p) => '/resident/complaints?id=' + (p.complaintId || ''),
  },
  COMPLAINT_RESOLVED: {
    category: 'COMPLAINTS',
    titleTemplate: (p) => 'Complaint Resolved: #' + (p.ticketNumber || p.complaintId || ''),
    bodyTemplate: (p) => 'Your ticket has been marked as resolved.',
    actionUrlTemplate: (p) => '/resident/complaints?id=' + (p.complaintId || ''),
  },
  COMPLAINT_CLOSED: {
    category: 'COMPLAINTS',
    titleTemplate: (p) => 'Complaint Closed: #' + (p.ticketNumber || p.complaintId || ''),
    bodyTemplate: (p) => 'Your ticket has been closed.',
    actionUrlTemplate: (p) => '/resident/complaints?id=' + (p.complaintId || ''),
  },

  // Maintenance & Billing
  INVOICE_GENERATED: {
    category: 'BILLING',
    titleTemplate: (p) => 'New Maintenance Invoice: ' + (p.invoiceNumber || ''),
    bodyTemplate: (p) => 'Invoice for ' + (p.period || 'period') + ' of amount ₹' + (p.amount || 0) + ' has been issued. Due: ' + (p.dueDate || 'N/A') + '.',
    actionUrlTemplate: () => '/resident/billing',
  },
  PAYMENT_RECORDED: {
    category: 'BILLING',
    titleTemplate: (p) => 'Payment Confirmed: ₹' + (p.amount || 0),
    bodyTemplate: (p) => 'Payment of ₹' + (p.amount || 0) + ' for invoice ' + (p.invoiceNumber || '') + ' recorded. Receipt #' + (p.receiptNumber || '') + '.',
    actionUrlTemplate: () => '/resident/billing',
  },
  RECEIPT_GENERATED: {
    category: 'BILLING',
    titleTemplate: (p) => 'Receipt Generated: #' + (p.receiptNumber || ''),
    bodyTemplate: (p) => 'Official receipt for payment of ₹' + (p.amount || 0) + ' is now available.',
    actionUrlTemplate: () => '/resident/billing',
  },

  // Circulars & Notices
  NOTICE_PUBLISHED: {
    category: 'NOTICES',
    titleTemplate: (p) => 'Notice: ' + (p.noticeTitle || 'New Notice'),
    bodyTemplate: (p) => p.summary || p.body || 'A new notice has been published by administration.',
    actionUrlTemplate: () => '/resident/notices',
  },
  IMPORTANT_NOTICE_PUBLISHED: {
    category: 'NOTICES',
    titleTemplate: (p) => 'Urgent Notice: ' + (p.noticeTitle || 'Notice'),
    bodyTemplate: (p) => p.summary || p.body || 'An urgent notice has been published.',
    actionUrlTemplate: () => '/resident/notices',
  },

  // Community Events
  EVENT_PUBLISHED: {
    category: 'EVENTS',
    titleTemplate: (p) => 'New Event: ' + (p.eventTitle || 'Event'),
    bodyTemplate: (p) => 'Join us for ' + (p.eventTitle || 'community event') + ' scheduled on ' + (p.date || 'upcoming') + '.',
    actionUrlTemplate: () => '/resident/events',
  },
  EVENT_UPDATED: {
    category: 'EVENTS',
    titleTemplate: (p) => 'Event Updated: ' + (p.eventTitle || 'Event'),
    bodyTemplate: (p) => 'Details updated for event "' + (p.eventTitle || 'community event') + '".',
    actionUrlTemplate: () => '/resident/events',
  },
  EVENT_CANCELLED: {
    category: 'EVENTS',
    titleTemplate: (p) => 'Event Cancelled: ' + (p.eventTitle || 'Event'),
    bodyTemplate: (p) => 'The event "' + (p.eventTitle || 'event') + '" has been cancelled.',
    actionUrlTemplate: () => '/resident/events',
  },

  // Governance & Meetings
  MEETING_PUBLISHED: {
    category: 'GENERAL',
    titleTemplate: (p) => 'Meeting Scheduled: ' + (p.meetingTitle || 'Meeting'),
    bodyTemplate: (p) => 'Meeting scheduled on ' + (p.date || '') + '. Agenda: ' + (p.agenda || 'General discussion') + '.',
    actionUrlTemplate: () => '/resident/meetings',
  },
  MEETING_UPDATED: {
    category: 'GENERAL',
    titleTemplate: (p) => 'Meeting Updated: ' + (p.meetingTitle || 'Meeting'),
    bodyTemplate: (p) => 'Meeting details updated for ' + (p.meetingTitle || 'scheduled meeting') + '.',
    actionUrlTemplate: () => '/resident/meetings',
  },
  MEETING_CANCELLED: {
    category: 'GENERAL',
    titleTemplate: (p) => 'Meeting Cancelled: ' + (p.meetingTitle || 'Meeting'),
    bodyTemplate: (p) => 'Meeting "' + (p.meetingTitle || 'meeting') + '" has been cancelled.',
    actionUrlTemplate: () => '/resident/meetings',
  },
  MINUTES_PUBLISHED: {
    category: 'GENERAL',
    titleTemplate: (p) => 'Meeting Minutes Published: ' + (p.meetingTitle || ''),
    bodyTemplate: (p) => 'Official meeting minutes are now available for review.',
    actionUrlTemplate: () => '/resident/meetings',
  },

  // General & Broadcast
  SOCIETY_BROADCAST: {
    category: 'GENERAL',
    titleTemplate: (p) => p.title || 'Society Broadcast',
    bodyTemplate: (p) => p.message || p.body || 'A broadcast announcement has been sent to the society.',
    actionUrlTemplate: (p) => p.actionUrl || '/resident/dashboard',
  },
  GENERAL_ANNOUNCEMENT: {
    category: 'GENERAL',
    titleTemplate: (p) => p.title || 'Society Announcement',
    bodyTemplate: (p) => p.message || p.body || 'An announcement has been shared by society administration.',
    actionUrlTemplate: (p) => p.actionUrl || '/resident/dashboard',
  },
};

export function renderNotificationTemplate(
  type: NotificationType,
  variables: Record<string, any>
): { category: NotificationCategory; title: string; body: string; actionUrl?: string } {
  const template = NOTIFICATION_TEMPLATES[type] || NOTIFICATION_TEMPLATES.GENERAL_ANNOUNCEMENT;
  return {
    category: template.category,
    title: template.titleTemplate(variables),
    body: template.bodyTemplate(variables),
    actionUrl: template.actionUrlTemplate ? template.actionUrlTemplate(variables) : undefined,
  };
}
