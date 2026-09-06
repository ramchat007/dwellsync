import { NotificationChannelProvider, SendChannelParams, SendChannelResult } from './types';

export class SimulatedWhatsAppProvider implements NotificationChannelProvider {
  channel = 'WHATSAPP' as const;
  providerName = 'Simulated WhatsApp Business Gateway';

  async send(params: SendChannelParams): Promise<SendChannelResult> {
    const simulatedId = 'wa_sim_' + Math.random().toString(36).substring(2, 10);
    return {
      channel: 'WHATSAPP',
      provider: this.providerName,
      status: 'DELIVERED',
      providerMessageId: simulatedId,
    };
  }
}

export const simulatedWhatsAppProvider = new SimulatedWhatsAppProvider();
