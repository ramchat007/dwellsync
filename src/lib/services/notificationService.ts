export type NotificationChannel = "EMAIL" | "SMS" | "WHATSAPP" | "PUSH" | "IN_APP";

export interface NotificationPayload {
  channel: NotificationChannel;
  recipient: string; // email, phone, or user_id
  subject?: string;
  template: string;
  data: Record<string, unknown>;
}

export interface NotificationResult {
  success: boolean;
  channel: NotificationChannel;
  messageId?: string;
  error?: string;
}

/**
 * Provider-agnostic notification dispatch service.
 * In Phase 1, logs structured notification payloads to audit trail and console.
 * Future phases will plug in SendGrid, Twilio, AWS SES, or WhatsApp Business API providers.
 */
export async function sendNotification(
  payload: NotificationPayload
): Promise<NotificationResult> {
  console.log(`[NotificationService] Sending ${payload.channel} to ${payload.recipient}:`, {
    template: payload.template,
    subject: payload.subject,
    data: payload.data,
  });

  // Simulated provider response
  return {
    success: true,
    channel: payload.channel,
    messageId: `notif_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
  };
}

