import { NotificationChannelProvider, SendChannelParams, SendChannelResult } from './types';

export class InAppNotificationProvider implements NotificationChannelProvider {
  channel = 'IN_APP' as const;
  providerName = 'DwellSync In-App Engine';

  async send(params: SendChannelParams): Promise<SendChannelResult> {
    // In-app notifications are stored directly in public.notifications table.
    // The provider confirms successful dispatch / availability to the client shell.
    return {
      channel: 'IN_APP',
      provider: this.providerName,
      status: 'DELIVERED',
      providerMessageId: params.notificationId,
    };
  }
}

export const inAppProvider = new InAppNotificationProvider();
