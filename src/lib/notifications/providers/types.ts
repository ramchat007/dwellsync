import { NotificationChannel, NotificationDeliveryStatus } from '../types';

export interface SendChannelParams {
  notificationId: string;
  recipientId: string;
  recipientEmail?: string | null;
  recipientPhone?: string | null;
  channel: NotificationChannel;
  title: string;
  body: string;
  actionUrl?: string | null;
  metadata?: Record<string, unknown> | null;
}

export interface SendChannelResult {
  channel: NotificationChannel;
  provider: string;
  status: NotificationDeliveryStatus;
  providerMessageId?: string;
  errorMessage?: string;
}

export interface NotificationChannelProvider {
  channel: NotificationChannel;
  providerName: string;
  send(params: SendChannelParams): Promise<SendChannelResult>;
}
