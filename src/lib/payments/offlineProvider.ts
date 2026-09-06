import {
  PaymentGatewayProvider,
  CreateOrderInput,
  PaymentOrderResult,
  VerifyPaymentInput,
  PaymentVerificationResult,
  RefundInput,
  RefundResult,
} from "./types";

/**
 * OfflinePaymentProvider
 * Handles offline / manual payment processing (Cash, Cheque, Direct Bank Transfer, Offline UPI)
 */
export class OfflinePaymentProvider implements PaymentGatewayProvider {
  readonly name = "OFFLINE_MANUAL";

  async createOrder(params: CreateOrderInput): Promise<PaymentOrderResult> {
    return {
      success: true,
      orderId: `MANUAL-${Date.now()}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`,
      amount: params.amount,
      currency: params.currency || "INR",
      providerData: { mode: "MANUAL_OFFLINE" },
    };
  }

  async verifyPayment(params: VerifyPaymentInput): Promise<PaymentVerificationResult> {
    return {
      success: true,
      transactionReference: params.paymentId || `REF-OFFLINE-${Date.now()}`,
      verifiedAmount: (params.payload?.amount as number) || 0,
    };
  }

  async refund(params: RefundInput): Promise<RefundResult> {
    return {
      success: true,
      refundId: `REFUND-OFFLINE-${params.paymentId}`,
    };
  }
}
