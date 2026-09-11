// ==========================================
// RESIDENT INVOICE PAYMENT GATEWAY TYPES
// ==========================================

export interface CreateOrderInput {
  amount: number;
  currency?: string;
  invoiceId?: string;
  societyId?: string;
  userId?: string;
  unitId?: string;
  receipt?: string;
  metadata?: Record<string, unknown>;
}

export interface PaymentOrderResult {
  success: boolean;
  orderId: string;
  amount: number;
  currency: string;
  providerData?: Record<string, unknown>;
  error?: string;
}

export interface VerifyPaymentInput {
  orderId: string;
  paymentId: string;
  signature?: string;
  payload?: Record<string, unknown>;
}

export interface PaymentVerificationParams {
  sessionId: string;
  paymentId?: string;
  signature?: string;
  metadata?: Record<string, unknown>;
}

export interface PaymentVerificationResult {
  success: boolean;
  transactionReference: string;
  verifiedAmount: number;
  isVerified?: boolean;
  status?: string;
  transactionId?: string;
  societyId?: string;
  planId?: string;
  metadata?: Record<string, unknown>;
  error?: string;
}

export interface RefundInput {
  paymentId: string;
  amount?: number;
  reason?: string;
}

export interface RefundResult {
  success: boolean;
  refundId?: string;
  error?: string;
}

export interface PaymentGatewayProvider {
  readonly name: string;
  createOrder(params: CreateOrderInput): Promise<PaymentOrderResult>;
  verifyPayment(params: VerifyPaymentInput): Promise<PaymentVerificationResult>;
  refund(params: RefundInput): Promise<RefundResult>;
}

// ==========================================
// SAAS SUBSCRIPTION PAYMENT ABSTRACTION TYPES
// ==========================================

export interface CheckoutSessionParams {
  societyId: string;
  planId: string;
  billingCycle: "monthly" | "annual";
  successUrl?: string;
  cancelUrl?: string;
  metadata?: Record<string, unknown>;
}

export interface CheckoutSessionResult {
  sessionId: string;
  checkoutUrl?: string;
  status: "completed" | "pending" | "failed";
  provider: string;
  metadata?: Record<string, unknown>;
}

export interface SubscriptionStatusResult {
  status: "TRIAL" | "ACTIVE" | "PAST_DUE" | "CANCELLED" | "EXPIRED";
  currentPeriodEnd?: string;
  provider: string;
  metadata?: Record<string, unknown>;
}

/**
 * Pluggable Payment Provider Interface for future SaaS subscription payments.
 * Keeps core business logic completely decoupled from external payment SDKs.
 */
export interface PaymentProvider {
  name: string;
  createCheckout(params: CheckoutSessionParams): Promise<CheckoutSessionResult>;
  verifyPayment(params: any): Promise<any>;
  cancelSubscription(societyId: string, subscriptionId: string): Promise<boolean>;
  getSubscriptionStatus(societyId: string, subscriptionId: string): Promise<SubscriptionStatusResult>;
}
