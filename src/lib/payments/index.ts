import { PaymentProvider } from "./types";
import { FreeTierPaymentProvider } from "./providers/freeProvider";

export * from "./types";
export * from "./providers/freeProvider";

const providerRegistry: Record<string, PaymentProvider> = {
  FREE_LOCAL_PROVIDER: new FreeTierPaymentProvider(),
};

/**
 * Returns the subscription payment provider by name, defaulting to the local FreeTierPaymentProvider.
 */
export function getSubscriptionPaymentProvider(providerName = "FREE_LOCAL_PROVIDER"): PaymentProvider {
  const provider = providerRegistry[providerName];
  if (!provider) {
    return providerRegistry.FREE_LOCAL_PROVIDER;
  }
  return provider;
}

export { getSubscriptionPaymentProvider as getPaymentProvider };

