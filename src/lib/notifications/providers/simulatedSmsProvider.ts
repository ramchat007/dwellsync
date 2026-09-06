import { NotificationChannelProvider, SendChannelParams, SendChannelResult } from './types';

export class SimulatedSmsProvider implements NotificationChannelProvider {
  channel = 'SMS' as const;
  providerName = 'Simulated SMS Gateway';

  async send(params: SendChannelParams): Promise<SendChannelResult> {
    const simulatedId = 'sms_sim_' + Math.random().toString(36).substring(2, 10);
    return {
      channel: 'SMS',
      provider: this.providerName,
      status: 'DELIVERED',
      providerMessageId: simulatedId,
    };
  }
}

export const simulatedSmsProvider = new SimulatedSmsProvider();
