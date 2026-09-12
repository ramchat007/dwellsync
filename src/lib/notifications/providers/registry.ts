import { NotificationChannel } from "../types";
import { NotificationChannelProvider } from "./types";
import { inAppProvider } from "./inAppProvider";
import { simulatedEmailProvider } from "./simulatedEmailProvider";
import { simulatedSmsProvider } from "./simulatedSmsProvider";
import { simulatedWhatsAppProvider } from "./simulatedWhatsAppProvider";

/**
 * Centralized Provider Registry for all Notification Channels.
 * Provides a clean abstraction boundary so third-party external providers
 * (e.g., AWS SES, Resend, Twilio, MSG91, WhatsApp Cloud API) can be plugged in
 * without altering any core dispatch services or caller business logic.
 */
export class NotificationProviderRegistry {
  private providers = new Map<NotificationChannel, NotificationChannelProvider>();

  constructor() {
    // Register default zero-cost in-process and simulated providers
    this.register(inAppProvider);
    this.register(simulatedEmailProvider);
    this.register(simulatedSmsProvider);
    this.register(simulatedWhatsAppProvider);
  }

  /**
   * Registers or replaces a channel provider.
   */
  register(provider: NotificationChannelProvider): void {
    this.providers.set(provider.channel, provider);
  }

  /**
   * Resolves the active provider for the given channel.
   * Throws if no provider is registered for that channel.
   */
  get(channel: NotificationChannel): NotificationChannelProvider {
    const provider = this.providers.get(channel);
    if (!provider) {
      throw new Error(`No notification provider registered for channel: ${channel}`);
    }
    return provider;
  }

  /**
   * Checks if a provider is registered for the given channel.
   */
  has(channel: NotificationChannel): boolean {
    return this.providers.has(channel);
  }

  /**
   * Returns all currently registered channel providers.
   */
  list(): NotificationChannelProvider[] {
    return Array.from(this.providers.values());
  }
}

export const notificationProviderRegistry = new NotificationProviderRegistry();
