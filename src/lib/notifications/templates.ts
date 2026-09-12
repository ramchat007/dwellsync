import { NotificationType, NotificationCategory } from './types';
import { Locale } from '../i18n/types';

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
  COMPLAINT_REOPENED: {
    category: 'COMPLAINTS',
    titleTemplate: (p) => 'Complaint Reopened: #' + (p.ticketNumber || p.complaintId || ''),
    bodyTemplate: (p) => 'Ticket has been reopened. Reason: ' + (p.reason || 'Unresolved issue'),
    actionUrlTemplate: (p) => '/resident/complaints?id=' + (p.complaintId || ''),
  },
  COMPLAINT_SLA_WARNING: {
    category: 'COMPLAINTS',
    titleTemplate: (p) => 'SLA Warning: Ticket #' + (p.ticketNumber || p.complaintId || ''),
    bodyTemplate: (p) => 'Ticket "' + (p.title || 'Complaint') + '" is approaching resolution deadline (due soon).',
    actionUrlTemplate: (p) => '/society/' + (p.societyId || '') + '/complaints',
  },
  COMPLAINT_SLA_BREACHED: {
    category: 'COMPLAINTS',
    titleTemplate: (p) => 'SLA Breached: Ticket #' + (p.ticketNumber || p.complaintId || ''),
    bodyTemplate: (p) => 'Ticket "' + (p.title || 'Complaint') + '" has breached its ' + (p.breachType || 'resolution') + ' SLA target.',
    actionUrlTemplate: (p) => '/society/' + (p.societyId || '') + '/complaints',
  },
  COMPLAINT_ESCALATED: {
    category: 'COMPLAINTS',
    titleTemplate: (p) => 'Ticket Escalated (Level ' + (p.level || 1) + '): #' + (p.ticketNumber || p.complaintId || ''),
    bodyTemplate: (p) => 'Ticket "' + (p.title || 'Complaint') + '" has been escalated to Level ' + (p.level || 1) + '. Reason: ' + (p.reason || 'SLA overdue'),
    actionUrlTemplate: (p) => '/society/' + (p.societyId || '') + '/complaints',
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
  PAYMENT_OVERDUE: {
    category: 'BILLING',
    titleTemplate: (p) => 'Payment Overdue: ₹' + (p.amount || 0),
    bodyTemplate: (p) => 'Payment for invoice ' + (p.invoiceNumber || '') + ' was due on ' + (p.dueDate || 'recently') + '. Please clear your dues.',
    actionUrlTemplate: () => '/resident/billing',
  },
  BILLING_CYCLE_STARTED: {
    category: 'BILLING',
    titleTemplate: (p) => 'New Billing Cycle: ' + (p.period || 'Current Period'),
    bodyTemplate: (p) => 'Maintenance billing cycle for ' + (p.period || 'this period') + ' has been initialized.',
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
  EVENT_REMINDER: {
    category: 'EVENTS',
    titleTemplate: (p) => 'Event Reminder: ' + (p.eventTitle || 'Event'),
    bodyTemplate: (p) => 'Reminder: "' + (p.eventTitle || 'Event') + '" is starting ' + (p.timeRemaining || 'soon') + ' at ' + (p.location || 'the society') + '.',
    actionUrlTemplate: () => '/resident/events',
  },
  POLL_PUBLISHED: {
    category: 'GENERAL',
    titleTemplate: (p) => 'New Society Poll: ' + (p.pollTitle || 'Poll'),
    bodyTemplate: (p) => 'Your vote matters! Please participate in "' + (p.pollTitle || 'new poll') + '" before ' + (p.closesAt || 'it closes') + '.',
    actionUrlTemplate: () => '/resident/polls',
  },
  POLL_REMINDER_CLOSING: {
    category: 'GENERAL',
    titleTemplate: (p) => 'Poll Closing Soon: ' + (p.pollTitle || 'Poll'),
    bodyTemplate: (p) => 'Last chance to cast your vote for "' + (p.pollTitle || 'Poll') + '". Voting closes ' + (p.timeRemaining || 'shortly') + '.',
    actionUrlTemplate: () => '/resident/polls',
  },
  POLL_CLOSED_RESULTS: {
    category: 'GENERAL',
    titleTemplate: (p) => 'Poll Results Available: ' + (p.pollTitle || 'Poll'),
    bodyTemplate: (p) => 'Voting has concluded for "' + (p.pollTitle || 'Poll') + '". View the final community results now.',
    actionUrlTemplate: () => '/resident/polls',
  },

  // Governance & Meetings
  MEETING_PUBLISHED: {
    category: 'GENERAL',
    titleTemplate: (p) => 'Meeting Scheduled: ' + (p.meetingTitle || 'Meeting'),
    bodyTemplate: (p) => 'Meeting scheduled on ' + (p.date || '') + '. Agenda: ' + (p.agenda || 'General discussion') + '.',
    actionUrlTemplate: () => '/resident/meetings',
  },
  MEETING_SCHEDULED: {
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
  ACTION_ITEM_ASSIGNED: {
    category: 'GENERAL',
    titleTemplate: (p) => 'Action Item Assigned: ' + (p.itemTitle || 'Task'),
    bodyTemplate: (p) => 'You have been assigned an action item: ' + (p.itemTitle || '') + (p.dueDate ? ' (Due: ' + p.dueDate + ')' : '') + '.',
    actionUrlTemplate: () => '/resident/meetings',
  },
  COMMITTEE_APPOINTED: {
    category: 'GENERAL',
    titleTemplate: (p) => 'Committee Appointment: ' + (p.committeeName || 'Managing Committee'),
    bodyTemplate: (p) => 'You have been appointed as ' + (p.designation || 'Member') + ' of ' + (p.committeeName || 'the committee') + '.',
    actionUrlTemplate: () => '/resident/committee',
  },
  COMMITTEE_MEMBER_REMOVED: {
    category: 'GENERAL',
    titleTemplate: (p) => 'Committee Roster Update: ' + (p.committeeName || 'Committee'),
    bodyTemplate: (p) => 'Your appointment in ' + (p.committeeName || 'the committee') + ' has concluded.',
    actionUrlTemplate: () => '/resident/committee',
  },
  COMMITTEE_MEMBER_RESIGNED: {
    category: 'GENERAL',
    titleTemplate: (p) => 'Resignation Recorded: ' + (p.committeeName || 'Committee'),
    bodyTemplate: (p) => 'Your resignation from ' + (p.committeeName || 'the committee') + ' has been formally recorded.',
    actionUrlTemplate: () => '/resident/committee',
  },
  COMMITTEE_DESIGNATION_CHANGED: {
    category: 'GENERAL',
    titleTemplate: (p) => 'Designation Updated: ' + (p.committeeName || 'Committee'),
    bodyTemplate: (p) => 'Your designation in ' + (p.committeeName || 'the committee') + ' has been updated to ' + (p.designation || 'Officer') + '.',
    actionUrlTemplate: () => '/resident/committee',
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

  // System & Access Alerts
  SYSTEM_ALERT: {
    category: 'GENERAL',
    titleTemplate: (p) => p.title || 'System Notification',
    bodyTemplate: (p) => p.message || p.body || 'A system-wide advisory has been issued.',
    actionUrlTemplate: () => '/resident/dashboard',
  },
  ACCOUNT_SECURITY_ALERT: {
    category: 'SECURITY',
    titleTemplate: (p) => p.title || 'Security Alert',
    bodyTemplate: (p) => p.message || 'A security event was detected on your account. If this was not you, please verify your credentials.',
    actionUrlTemplate: () => '/resident/settings',
  },
  ACCESS_REQUEST_SUBMITTED: {
    category: 'GENERAL',
    titleTemplate: (p) => 'Access Request Received: ' + (p.userName || 'New Member'),
    bodyTemplate: (p) => (p.userName || 'A user') + ' requested access to unit ' + (p.unitNumber || '') + '.',
    actionUrlTemplate: () => '/society/dashboard',
  },
  ACCESS_REQUEST_APPROVED: {
    category: 'GENERAL',
    titleTemplate: () => 'Society Access Approved',
    bodyTemplate: (p) => 'Your request to join ' + (p.societyName || 'the society') + ' has been approved. Welcome!',
    actionUrlTemplate: () => '/resident/dashboard',
  },
  ACCESS_REQUEST_REJECTED: {
    category: 'GENERAL',
    titleTemplate: () => 'Society Access Request Update',
    bodyTemplate: (p) => 'Your access request was declined' + (p.reason ? ': ' + p.reason : '. Please contact administration.'),
    actionUrlTemplate: () => '/login',
  },

  // Phase 13 Handover Notifications
  HANDOVER_CHECKLIST_ASSIGNED: {
    category: 'GENERAL',
    titleTemplate: (p) => 'Handover Checklist Assigned: ' + (p.itemTitle || 'Item'),
    bodyTemplate: (p) => 'You have been assigned handover checklist item "' + (p.itemTitle || 'Item') + '" for project "' + (p.projectTitle || 'Handover Project') + '".',
    actionUrlTemplate: (p) => p.actionUrl || '/society/' + (p.societyId || '') + '/handover/' + (p.projectId || ''),
  },
  HANDOVER_CHECKLIST_OVERDUE: {
    category: 'GENERAL',
    titleTemplate: (p) => 'Overdue Checklist Item: ' + (p.itemTitle || 'Item'),
    bodyTemplate: (p) => 'Handover checklist item "' + (p.itemTitle || 'Item') + '" was due on ' + (p.dueDate || 'N/A') + ' and is still pending.',
    actionUrlTemplate: (p) => p.actionUrl || '/society/' + (p.societyId || '') + '/handover/' + (p.projectId || ''),
  },
  HANDOVER_DEFECT_ASSIGNED: {
    category: 'GENERAL',
    titleTemplate: (p) => 'Handover Defect Assigned: ' + (p.defectTitle || 'Defect'),
    bodyTemplate: (p) => 'You have been assigned defect "' + (p.defectTitle || 'Defect') + '" (Severity: ' + (p.severity || 'N/A') + ') for handover project "' + (p.projectTitle || '') + '".',
    actionUrlTemplate: (p) => p.actionUrl || '/society/' + (p.societyId || '') + '/handover/' + (p.projectId || ''),
  },
  HANDOVER_COMMITMENT_OVERDUE: {
    category: 'GENERAL',
    titleTemplate: (p) => 'Builder Commitment Overdue: ' + (p.commitmentTitle || 'Commitment'),
    bodyTemplate: (p) => 'Builder commitment "' + (p.commitmentTitle || 'Commitment') + '" was due on ' + (p.targetDate || 'N/A') + ' and remains incomplete.',
    actionUrlTemplate: (p) => p.actionUrl || '/society/' + (p.societyId || '') + '/handover/' + (p.projectId || ''),
  },
  HANDOVER_READY_FOR_ACCEPTANCE: {
    category: 'GENERAL',
    titleTemplate: (p) => 'Handover Ready for Acceptance: ' + (p.projectTitle || 'Project'),
    bodyTemplate: (p) => 'Handover project "' + (p.projectTitle || 'Project') + '" is now READY FOR HANDOVER and requires committee review and acceptance.',
    actionUrlTemplate: (p) => p.actionUrl || '/society/' + (p.societyId || '') + '/handover/' + (p.projectId || ''),
  },

  // Document Management Notifications
  DOCUMENT_PUBLISHED: {
    category: 'NOTICES',
    titleTemplate: (p) => 'Official Document Published: ' + (p.documentTitle || 'New Document'),
    bodyTemplate: (p) => (p.category ? `[${p.category.replace(/_/g, ' ')}] ` : '') + (p.documentTitle || 'A document') + ' has been approved and published for society members.',
    actionUrlTemplate: (p) => p.actionUrl || (p.isResident ? `/resident/documents?id=${p.documentId || ''}` : `/society/${p.societyId || ''}/documents?id=${p.documentId || ''}`),
  },
  DOCUMENT_APPROVED: {
    category: 'GENERAL',
    titleTemplate: (p) => 'Document Approved: ' + (p.documentTitle || 'Document'),
    bodyTemplate: (p) => 'Document "' + (p.documentTitle || 'Document') + '" has been approved by the committee.',
    actionUrlTemplate: (p) => p.actionUrl || `/society/${p.societyId || ''}/documents?id=${p.documentId || ''}`,
  },
  DOCUMENT_REVIEW_REQUESTED: {
    category: 'GENERAL',
    titleTemplate: (p) => 'Document Pending Review: ' + (p.documentTitle || 'Document'),
    bodyTemplate: (p) => 'A new document "' + (p.documentTitle || 'Document') + '" was submitted for committee review.',
    actionUrlTemplate: (p) => p.actionUrl || `/society/${p.societyId || ''}/documents?id=${p.documentId || ''}`,
  },
};

const MARATHI_TEMPLATES: Partial<Record<NotificationType, { titleTemplate?: (p: Record<string, any>) => string; bodyTemplate?: (p: Record<string, any>) => string }>> = {
  VISITOR_INVITED: {
    titleTemplate: (p) => 'पास कोड तयार केला: ' + (p.visitorName || 'अभ्यागत'),
    bodyTemplate: (p) => (p.visitorName || 'तुमच्या अभ्यागता') + 'साठी पूर्व-मंजूर पास कोड ' + (p.passCode || '') + ' तयार केला आहे.',
  },
  VISITOR_APPROVED: {
    titleTemplate: (p) => 'अभ्यागत मंजूर: ' + (p.visitorName || 'अभ्यागत'),
    bodyTemplate: (p) => (p.visitorName || 'अभ्यागत') + ' यांना गेट प्रवेशासाठी मंजुरी मिळाली आहे.',
  },
  VISITOR_CHECKED_IN: {
    titleTemplate: (p) => 'अभ्यागत आगमन: ' + (p.visitorName || 'अभ्यागत'),
    bodyTemplate: (p) => (p.visitorName || 'अभ्यागत') + ' यांनी फ्लॅट ' + (p.unitNumber || '') + ' साठी गेटवर चेक-इन केले आहे.',
  },
  VISITOR_CHECKED_OUT: {
    titleTemplate: (p) => 'अभ्यागत रवाना: ' + (p.visitorName || 'अभ्यागत'),
    bodyTemplate: (p) => (p.visitorName || 'अभ्यागत') + ' गेटवरून बाहेर पडले आहेत.',
  },
  VISITOR_CANCELLED: {
    titleTemplate: (p) => 'अभ्यागत रद्द: ' + (p.visitorName || 'अभ्यागत'),
    bodyTemplate: (p) => (p.visitorName || 'अभ्यागत') + ' चा पास रद्द करण्यात आला आहे.',
  },
  COMPLAINT_SUBMITTED: {
    titleTemplate: (p) => 'तक्रार नोंदवली: #' + (p.ticketNumber || p.complaintId || ''),
    bodyTemplate: (p) => 'तुमची तक्रार "' + (p.title || 'मदत विनंती') + '" नोंदवली गेली आहे.',
  },
  COMPLAINT_ASSIGNED: {
    titleTemplate: (p) => 'तक्रार सोपवली: #' + (p.ticketNumber || p.complaintId || ''),
    bodyTemplate: (p) => 'तुमचे तिकीट ' + (p.assignedTo || 'तंत्रज्ञांकडे') + ' सोपवले आहे.',
  },
  COMPLAINT_STATUS_CHANGED: {
    titleTemplate: (p) => 'तक्रार स्थिती: #' + (p.ticketNumber || p.complaintId || ''),
    bodyTemplate: (p) => 'स्थिती अद्ययावत केली: ' + (p.status || 'अद्ययावत') + (p.remarks ? '. ' + p.remarks : ''),
  },
  COMPLAINT_RESOLVED: {
    titleTemplate: (p) => 'तक्रार निवारण पूर्ण: #' + (p.ticketNumber || p.complaintId || ''),
    bodyTemplate: (p) => 'तुमची तक्रार निवारण पूर्ण म्हणून चिन्हांकित केली आहे.',
  },
  COMPLAINT_CLOSED: {
    titleTemplate: (p) => 'तक्रार बंद केली: #' + (p.ticketNumber || p.complaintId || ''),
    bodyTemplate: (p) => 'तुमचे तिकीट बंद केले आहे.',
  },
  COMPLAINT_REOPENED: {
    titleTemplate: (p) => 'तक्रार पुन्हा उघडली: #' + (p.ticketNumber || p.complaintId || ''),
    bodyTemplate: (p) => 'तक्रार पुन्हा उघडली आहे. कारण: ' + (p.reason || 'अनिराकरण'),
  },
  COMPLAINT_SLA_WARNING: {
    titleTemplate: (p) => 'एसएलए इशारा: तिकीट #' + (p.ticketNumber || p.complaintId || ''),
    bodyTemplate: (p) => 'तक्रार "' + (p.title || 'तक्रार') + '" ची मुदत लवकरच संपत आहे.',
  },
  COMPLAINT_SLA_BREACHED: {
    titleTemplate: (p) => 'एसएलए मर्यादा ओलांडली: तिकीट #' + (p.ticketNumber || p.complaintId || ''),
    bodyTemplate: (p) => 'तक्रार "' + (p.title || 'तक्रार') + '" ने एसएलए मुदत ओलांडली आहे.',
  },
  COMPLAINT_ESCALATED: {
    titleTemplate: (p) => 'तक्रार वर्ग केली (पातळी ' + (p.level || 1) + '): #' + (p.ticketNumber || p.complaintId || ''),
    bodyTemplate: (p) => 'तक्रार "' + (p.title || 'तक्रार') + '" उच्च पातळीवर वर्ग केली आहे.',
  },
  INVOICE_GENERATED: {
    titleTemplate: (p) => 'नवीन देखभाल चलन: ' + (p.invoiceNumber || ''),
    bodyTemplate: (p) => (p.period || 'कालावधी') + ' साठी ₹' + (p.amount || 0) + ' चे चलन जारी केले आहे. देय तारीख: ' + (p.dueDate || 'लागू नाही') + '.',
  },
  PAYMENT_RECORDED: {
    titleTemplate: (p) => 'पेमेंट प्राप्त झाले: ₹' + (p.amount || 0),
    bodyTemplate: (p) => 'चलन ' + (p.invoiceNumber || '') + ' साठी ₹' + (p.amount || 0) + ' चे पेमेंट नोंदवले. पावती #' + (p.receiptNumber || '') + '.',
  },
  RECEIPT_GENERATED: {
    titleTemplate: (p) => 'पावती तयार केली: #' + (p.receiptNumber || ''),
    bodyTemplate: (p) => '₹' + (p.amount || 0) + ' च्या देयकाची अधिकृत पावती आता उपलब्ध आहे.',
  },
  NOTICE_PUBLISHED: {
    titleTemplate: (p) => 'सूचना: ' + (p.noticeTitle || 'नवीन सूचना'),
    bodyTemplate: (p) => p.summary || p.body || 'प्रशासनाकडून नवीन सूचना प्रसिद्ध केली आहे.',
  },
  IMPORTANT_NOTICE_PUBLISHED: {
    titleTemplate: (p) => 'तातडीची सूचना: ' + (p.noticeTitle || 'सूचना'),
    bodyTemplate: (p) => p.summary || p.body || 'तातडीची सूचना प्रसिद्ध करण्यात आली आहे.',
  },
  EVENT_PUBLISHED: {
    titleTemplate: (p) => 'नवीन कार्यक्रम: ' + (p.eventTitle || 'कार्यक्रम'),
    bodyTemplate: (p) => (p.date || 'आगामी') + ' रोजी आयोजित ' + (p.eventTitle || 'सोसायटी कार्यक्रमात') + ' सहभागी व्हा.',
  },
  POLL_PUBLISHED: {
    titleTemplate: (p) => 'नवीन सोसायटी मतदान: ' + (p.pollTitle || 'मतदान'),
    bodyTemplate: (p) => 'आपले मत महत्त्वाचे आहे! "' + (p.pollTitle || 'मतदान') + '" मध्ये सहभागी व्हा.',
  },
  MEETING_SCHEDULED: {
    titleTemplate: (p) => 'बैठक नियोजित: ' + (p.meetingTitle || 'बैठक'),
    bodyTemplate: (p) => (p.date || '') + ' रोजी बैठक आयोजित केली आहे. विषय: ' + (p.agenda || 'सर्वसाधारण चर्चा') + '.',
  },
  MEETING_PUBLISHED: {
    titleTemplate: (p) => 'बैठक नियोजित: ' + (p.meetingTitle || 'बैठक'),
    bodyTemplate: (p) => (p.date || '') + ' रोजी बैठक आयोजित केली आहे. विषय: ' + (p.agenda || 'सर्वसाधारण चर्चा') + '.',
  },
  PAYMENT_OVERDUE: {
    titleTemplate: (p) => 'देयक थकीत: ₹' + (p.amount || 0),
    bodyTemplate: (p) => 'चलन ' + (p.invoiceNumber || '') + ' चे देयक ' + (p.dueDate || 'नुकतेच') + ' थकीत झाले आहे. कृपया रक्कम भरा.',
  },
  BILLING_CYCLE_STARTED: {
    titleTemplate: (p) => 'नवीन बिलिंग सायकल: ' + (p.period || 'कालावधी'),
    bodyTemplate: (p) => (p.period || 'या कालावधी') + 'साठी देखभाल शुल्क बिलिंग सुरू झाले आहे.',
  },
  SYSTEM_ALERT: {
    titleTemplate: (p) => p.title || 'प्रणाली सूचना',
    bodyTemplate: (p) => p.message || p.body || 'प्रणालीकडून महत्त्वाची सूचना जारी केली आहे.',
  },
  ACCOUNT_SECURITY_ALERT: {
    titleTemplate: (p) => p.title || 'सुरक्षा इशारा',
    bodyTemplate: (p) => p.message || 'आपल्या खात्यावर सुरक्षा घटना आढळली आहे. कृपया पडताळणी करा.',
  },
  ACCESS_REQUEST_SUBMITTED: {
    titleTemplate: (p) => 'प्रवेश विनंती प्राप्त: ' + (p.userName || 'नवीन सदस्य'),
    bodyTemplate: (p) => (p.userName || 'एका युझरने') + ' सदनिका ' + (p.unitNumber || '') + ' साठी प्रवेश विनंती पाठवली आहे.',
  },
  ACCESS_REQUEST_APPROVED: {
    titleTemplate: () => 'सोसायटी प्रवेश मंजूर',
    bodyTemplate: (p) => (p.societyName || 'सोसायटी') + ' मध्ये सामील होण्याची आपली विनंती मंजूर करण्यात आली आहे. स्वागत!',
  },
  ACCESS_REQUEST_REJECTED: {
    titleTemplate: () => 'सोसायटी प्रवेश विनंती अपडेट',
    bodyTemplate: (p) => 'आपली विनंती नाकारण्यात आली आहे' + (p.reason ? ': ' + p.reason : '. प्रशासनाशी संपर्क साधा.'),
  },
};

const HINDI_TEMPLATES: Partial<Record<NotificationType, { titleTemplate?: (p: Record<string, any>) => string; bodyTemplate?: (p: Record<string, any>) => string }>> = {
  VISITOR_INVITED: {
    titleTemplate: (p) => 'पास कोड तैयार हुआ: ' + (p.visitorName || 'अतिथि'),
    bodyTemplate: (p) => (p.visitorName || 'आपके अतिथि') + ' के लिए पूर्व-स्वीकृत पास कोड ' + (p.passCode || '') + ' तैयार किया गया है।',
  },
  VISITOR_APPROVED: {
    titleTemplate: (p) => 'अतिथि स्वीकृत: ' + (p.visitorName || 'अतिथि'),
    bodyTemplate: (p) => (p.visitorName || 'अतिथि') + ' को गेट प्रवेश के लिए मंजूरी मिल गई है।',
  },
  VISITOR_CHECKED_IN: {
    titleTemplate: (p) => 'अतिथि आगमन: ' + (p.visitorName || 'अतिथि'),
    bodyTemplate: (p) => (p.visitorName || 'अतिथि') + ' ने फ्लैट ' + (p.unitNumber || '') + ' के लिए गेट पर चेक-इन किया है।',
  },
  VISITOR_CHECKED_OUT: {
    titleTemplate: (p) => 'अतिथि प्रस्थान: ' + (p.visitorName || 'अतिथि'),
    bodyTemplate: (p) => (p.visitorName || 'अतिथि') + ' गेट से बाहर चले गए हैं।',
  },
  VISITOR_CANCELLED: {
    titleTemplate: (p) => 'अतिथि रद्द: ' + (p.visitorName || 'अतिथि'),
    bodyTemplate: (p) => (p.visitorName || 'अतिथि') + ' का पास रद्द कर दिया गया है।',
  },
  COMPLAINT_SUBMITTED: {
    titleTemplate: (p) => 'शिकायत दर्ज की गई: #' + (p.ticketNumber || p.complaintId || ''),
    bodyTemplate: (p) => 'आपकी शिकायत "' + (p.title || 'सहायता अनुरोध') + '" दर्ज कर ली गई है।',
  },
  COMPLAINT_ASSIGNED: {
    titleTemplate: (p) => 'शिकायत सौंपी गई: #' + (p.ticketNumber || p.complaintId || ''),
    bodyTemplate: (p) => 'आपका टिकट ' + (p.assignedTo || 'तकनीशियन') + ' को सौंपा गया है।',
  },
  COMPLAINT_STATUS_CHANGED: {
    titleTemplate: (p) => 'शिकायत स्थिति: #' + (p.ticketNumber || p.complaintId || ''),
    bodyTemplate: (p) => 'स्थिति अपडेट की गई: ' + (p.status || 'अपडेट') + (p.remarks ? '. ' + p.remarks : ''),
  },
  COMPLAINT_RESOLVED: {
    titleTemplate: (p) => 'शिकायत का समाधान हुआ: #' + (p.ticketNumber || p.complaintId || ''),
    bodyTemplate: (p) => 'आपकी शिकायत का समाधान कर दिया गया है।',
  },
  COMPLAINT_CLOSED: {
    titleTemplate: (p) => 'शिकायत बंद की गई: #' + (p.ticketNumber || p.complaintId || ''),
    bodyTemplate: (p) => 'आपका टिकट बंद कर दिया गया है।',
  },
  COMPLAINT_REOPENED: {
    titleTemplate: (p) => 'शिकायत पुनः खोली गई: #' + (p.ticketNumber || p.complaintId || ''),
    bodyTemplate: (p) => 'शिकायत पुनः खोल दी गई है। कारण: ' + (p.reason || 'अनिराकरण'),
  },
  COMPLAINT_SLA_WARNING: {
    titleTemplate: (p) => 'एसएलए चेतावनी: टिकट #' + (p.ticketNumber || p.complaintId || ''),
    bodyTemplate: (p) => 'शिकायत "' + (p.title || 'शिकायत') + '" की समय-सीमा जल्द समाप्त हो रही है।',
  },
  COMPLAINT_SLA_BREACHED: {
    titleTemplate: (p) => 'एसएलए उल्लंघन: टिकट #' + (p.ticketNumber || p.complaintId || ''),
    bodyTemplate: (p) => 'शिकायत "' + (p.title || 'शिकायत') + '" ने अपनी एसएलए समय-सीमा पार कर ली है।',
  },
  COMPLAINT_ESCALATED: {
    titleTemplate: (p) => 'शिकायत अग्रेषित (स्तर ' + (p.level || 1) + '): #' + (p.ticketNumber || p.complaintId || ''),
    bodyTemplate: (p) => 'शिकायत "' + (p.title || 'शिकायत') + '" को स्तर ' + (p.level || 1) + ' पर अग्रेषित किया गया है।',
  },
  INVOICE_GENERATED: {
    titleTemplate: (p) => 'नया रखरखाव चालान: ' + (p.invoiceNumber || ''),
    bodyTemplate: (p) => (p.period || 'अवधि') + ' के लिए ₹' + (p.amount || 0) + ' का चालान जारी किया गया है। नियत तिथि: ' + (p.dueDate || 'लागू नहीं') + '।',
  },
  PAYMENT_RECORDED: {
    titleTemplate: (p) => 'भुगतान की पुष्टि: ₹' + (p.amount || 0),
    bodyTemplate: (p) => 'चालान ' + (p.invoiceNumber || '') + ' के लिए ₹' + (p.amount || 0) + ' का भुगतान दर्ज किया गया। रसीद #' + (p.receiptNumber || '') + '।',
  },
  RECEIPT_GENERATED: {
    titleTemplate: (p) => 'रसीद जनरेट हुई: #' + (p.receiptNumber || ''),
    bodyTemplate: (p) => '₹' + (p.amount || 0) + ' के भुगतान की आधिकारिक रसीद अब उपलब्ध है।',
  },
  NOTICE_PUBLISHED: {
    titleTemplate: (p) => 'सूचना: ' + (p.noticeTitle || 'नई सूचना'),
    bodyTemplate: (p) => p.summary || p.body || 'प्रशासन द्वारा एक नई सूचना जारी की गई है।',
  },
  IMPORTANT_NOTICE_PUBLISHED: {
    titleTemplate: (p) => 'आवश्यक सूचना: ' + (p.noticeTitle || 'सूचना'),
    bodyTemplate: (p) => p.summary || p.body || 'एक आवश्यक सूचना प्रकाशित की गई है।',
  },
  EVENT_PUBLISHED: {
    titleTemplate: (p) => 'नया कार्यक्रम: ' + (p.eventTitle || 'कार्यक्रम'),
    bodyTemplate: (p) => (p.date || 'आगामी') + ' को आयोजित ' + (p.eventTitle || 'सोसायटी कार्यक्रम') + ' में भाग लें।',
  },
  POLL_PUBLISHED: {
    titleTemplate: (p) => 'नया सोसायटी मतदान: ' + (p.pollTitle || 'मतदान'),
    bodyTemplate: (p) => 'आपका वोट महत्वपूर्ण है! "' + (p.pollTitle || 'मतदान') + '" में भाग लें।',
  },
  MEETING_SCHEDULED: {
    titleTemplate: (p) => 'बैठक निर्धारित: ' + (p.meetingTitle || 'बैठक'),
    bodyTemplate: (p) => (p.date || '') + ' को बैठक निर्धारित की गई है। एजेंडा: ' + (p.agenda || 'सामान्य चर्चा') + '।',
  },
  MEETING_PUBLISHED: {
    titleTemplate: (p) => 'बैठक निर्धारित: ' + (p.meetingTitle || 'बैठक'),
    bodyTemplate: (p) => (p.date || '') + ' को बैठक निर्धारित की गई है। एजेंडा: ' + (p.agenda || 'सामान्य चर्चा') + '।',
  },
  PAYMENT_OVERDUE: {
    titleTemplate: (p) => 'भुगतान बकाया: ₹' + (p.amount || 0),
    bodyTemplate: (p) => 'चालान ' + (p.invoiceNumber || '') + ' का भुगतान ' + (p.dueDate || 'हाल ही में') + ' देय था। कृपया बकाया राशि का भुगतान करें।',
  },
  BILLING_CYCLE_STARTED: {
    titleTemplate: (p) => 'नया बिलिंग चक्र: ' + (p.period || 'अवधि'),
    bodyTemplate: (p) => (p.period || 'इस अवधि') + ' के लिए रखरखाव शुल्क बिलिंग चक्र शुरू हो गया है।',
  },
  SYSTEM_ALERT: {
    titleTemplate: (p) => p.title || 'सिस्टम अधिसूचना',
    bodyTemplate: (p) => p.message || p.body || 'प्रशासन द्वारा महत्वपूर्ण सिस्टम परामर्श जारी किया गया है।',
  },
  ACCOUNT_SECURITY_ALERT: {
    titleTemplate: (p) => p.title || 'सुरक्षा चेतावनी',
    bodyTemplate: (p) => p.message || 'आपके खाते पर एक सुरक्षा घटना का पता चला है। कृपया अपने विवरण की पुष्टि करें।',
  },
  ACCESS_REQUEST_SUBMITTED: {
    titleTemplate: (p) => 'प्रवेश अनुरोध प्राप्त: ' + (p.userName || 'नया सदस्य'),
    bodyTemplate: (p) => (p.userName || 'एक उपयोगकर्ता') + ' ने फ्लैट ' + (p.unitNumber || '') + ' के लिए प्रवेश का अनुरोध किया है।',
  },
  ACCESS_REQUEST_APPROVED: {
    titleTemplate: () => 'सोसायटी प्रवेश स्वीकृत',
    bodyTemplate: (p) => (p.societyName || 'सोसायटी') + ' में शामिल होने का आपका अनुरोध स्वीकार कर लिया गया है। स्वागत है!',
  },
  ACCESS_REQUEST_REJECTED: {
    titleTemplate: () => 'प्रवेश अनुरोध अपडेट',
    bodyTemplate: (p) => 'आपका अनुरोध अस्वीकार कर दिया गया है' + (p.reason ? ': ' + p.reason : '। कृपया प्रशासन से संपर्क करें।'),
  },
};

export function renderNotificationTemplate(
  type: NotificationType,
  variables: Record<string, any>,
  locale: Locale = 'en'
): { category: NotificationCategory; title: string; body: string; actionUrl?: string } {
  const base = NOTIFICATION_TEMPLATES[type] || NOTIFICATION_TEMPLATES.GENERAL_ANNOUNCEMENT;

  let title = base.titleTemplate(variables);
  let body = base.bodyTemplate(variables);

  if (locale === 'mr') {
    const mr = MARATHI_TEMPLATES[type];
    if (mr?.titleTemplate) title = mr.titleTemplate(variables);
    if (mr?.bodyTemplate) body = mr.bodyTemplate(variables);
  } else if (locale === 'hi') {
    const hi = HINDI_TEMPLATES[type];
    if (hi?.titleTemplate) title = hi.titleTemplate(variables);
    if (hi?.bodyTemplate) body = hi.bodyTemplate(variables);
  }

  return {
    category: base.category,
    title,
    body,
    actionUrl: base.actionUrlTemplate ? base.actionUrlTemplate(variables) : undefined,
  };
}
