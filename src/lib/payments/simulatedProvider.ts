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
 * SimulatedGatewayProvider
 * Implements digital gateway contract for testing and staging environments
 * Zero card-credential storage, clean payment token simulation.
 */
export class SimulatedGatewayProvider implements PaymentGatewayProvider {
  readonly name = "SIMULATED_GATEWAY";

  async createOrder(params: CreateOrderInput): Promise<PaymentOrderResult> {
    if (params.amount <= 0) {
      return {
        success: false,
        orderId: "",
        amount: 0,
        currency: "INR",
        error: "Invalid order amount",
      };
    }

    const orderId = `order_sim_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    return {
      success: true,
      orderId,
      amount: params.amount,
      currency: params.currency || "INR",
      providerData: {
        provider: "SIMULATED",
        status: "created",
      },
    };
  }

  async verifyPayment(params: VerifyPaymentInput): Promise<PaymentVerificationResult> {
    if (!params.orderId || !params.paymentId) {
      return {
        success: false,
        transactionReference: "",
        verifiedAmount: 0,
        error: "Missing required order or payment ID for verification",
      };
    }

    return {
      success: true,
      transactionReference: `pay_sim_${params.paymentId.replace(/-/g, "").substring(0, 14)}`,
      verifiedAmount: (params.payload?.amount as number) || 0,
    };
  }

  async refund(params: RefundInput): Promise<RefundResult> {
    return {
      success: true,
      refundId: `rfnd_sim_${params.paymentId.substring(0, 8)}`,
    };
  }
}
