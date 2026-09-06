// Payment Gateway Provider Abstraction
// Decouples business logic from specific payment processors (Cash/Offline, Razorpay, Stripe, etc.)

export interface CreateOrderInput {
  societyId: string;
  invoiceId: string;
  unitId: string;
  amount: number;
  currency?: string;
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
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

export interface PaymentVerificationResult {
  success: boolean;
  transactionReference: string;
  verifiedAmount: number;
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
