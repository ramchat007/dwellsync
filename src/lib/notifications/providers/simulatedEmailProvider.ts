import { NotificationChannelProvider, SendChannelParams, SendChannelResult } from './types';

export class SimulatedEmailProvider implements NotificationChannelProvider {
  channel = 'EMAIL' as const;
  providerName = 'Simulated Email Gateway';

  async send(params: SendChannelParams): Promise<SendChannelResult> {
    if (!params.recipientEmail && !params.recipientId) {
      return {
        channel: 'EMAIL',
        provider: this.providerName,
        status: 'FAILED',
        errorMessage: 'Missing recipient email address',
      };
    }

    // Safe simulated delivery log
    const simulatedId = 'email_sim_' + Math.random().toString(36).substring(2, 10);
    return {
      channel: 'EMAIL',
      provider: this.providerName,
      status: 'DELIVERED',
      providerMessageId: simulatedId,
    };
  }
}

export const simulatedEmailProvider = new SimulatedEmailProvider();
