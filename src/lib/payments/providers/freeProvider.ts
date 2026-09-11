import {
  CheckoutSessionParams,
  CheckoutSessionResult,
  PaymentProvider,
  PaymentVerificationParams,
  PaymentVerificationResult,
  SubscriptionStatusResult,
} from "../types";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Free/Local Payment Provider implementation.
 * Used for development, testing, and 100% free operational mode.
 * Does NOT connect to any external gateway or execute real payment transactions.
 */
export class FreeTierPaymentProvider implements PaymentProvider {
  public readonly name = "FREE_LOCAL_PROVIDER";

  async createCheckout(params: CheckoutSessionParams): Promise<CheckoutSessionResult> {
    const sessionId = `free_sess_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    // Automatically activates the subscription immediately without charging
    const adminClient = createAdminClient();
    const periodEnd = new Date(
      Date.now() + (params.billingCycle === "annual" ? 365 : 30) * 86400 * 1000
    ).toISOString();

    await adminClient
      .from("society_subscriptions")
      .upsert(
        {
          society_id: params.societyId,
          plan_id: params.planId,
          status: "ACTIVE",
          billing_cycle: params.billingCycle,
          current_period_start: new Date().toISOString(),
          current_period_end: periodEnd,
          cancel_at_period_end: false,
          provider: this.name,
          metadata: {
            session_id: sessionId,
            activated_via: "free_local_provider",
            ...params.metadata,
          },
          updated_at: new Date().toISOString(),
        },
        { onConflict: "society_id" }
      );

    return {
      sessionId,
      checkoutUrl: params.successUrl || "/superadmin/subscriptions",
      status: "completed",
      provider: this.name,
      metadata: {
        free_tier_activated: true,
      },
    };
  }

  async verifyPayment(params: PaymentVerificationParams): Promise<PaymentVerificationResult> {
    // In free provider mode, valid sessions are confirmed without external gateway queries
    return {
      success: true,
      transactionReference: params.sessionId || "FREE_SESSION",
      verifiedAmount: 0,
      isVerified: true,
      societyId: (params.metadata?.societyId as string) || "",
      planId: (params.metadata?.planId as string) || "",
      transactionId: `free_tx_${Date.now()}`,
      status: "paid",
      metadata: {
        verified_by: this.name,
      },
    };
  }

  async cancelSubscription(societyId: string, subscriptionId: string): Promise<boolean> {
    const adminClient = createAdminClient();
    const { error } = await adminClient
      .from("society_subscriptions")
      .update({
        cancel_at_period_end: true,
        cancelled_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("society_id", societyId)
      .eq("id", subscriptionId);

    return !error;
  }

  async getSubscriptionStatus(
    societyId: string,
    subscriptionId: string
  ): Promise<SubscriptionStatusResult> {
    const adminClient = createAdminClient();
    const { data: sub } = await adminClient
      .from("society_subscriptions")
      .select("status, current_period_end, metadata")
      .eq("society_id", societyId)
      .eq("id", subscriptionId)
      .maybeSingle();

    return {
      status: (sub?.status as SubscriptionStatusResult["status"]) || "ACTIVE",
      currentPeriodEnd: sub?.current_period_end,
      provider: this.name,
      metadata: sub?.metadata || {},
    };
  }
}
