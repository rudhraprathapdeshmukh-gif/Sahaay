/**
 * Mock Payment Gateway for Sahaay
 * Simulates payment processing (can be swapped with Razorpay/Stripe later)
 *
 * 95% success rate, 5% random failures for testing error handling
 */

import type { GatewayPaymentRequest, GatewayPaymentResponse } from '@/types/payments';

export class MockPaymentGateway {
  /**
   * Process a payment through the mock gateway
   */
  async processPayment(request: GatewayPaymentRequest): Promise<GatewayPaymentResponse> {
    // Simulate network delay (300-800ms)
    await new Promise(resolve => setTimeout(resolve, 300 + Math.random() * 500));

    // 95% success rate, 5% random failure
    const isSuccess = Math.random() > 0.05;

    const response: GatewayPaymentResponse = {
      id: `mock_txn_${Date.now()}_${Math.random().toString(36).substring(7)}`,
      entity: 'payment',
      status: isSuccess ? 'captured' : 'failed',
      amount: request.amount,
      currency: 'INR',
      receipt: request.receipt,
      created_at: Math.floor(Date.now() / 1000),
    };

    if (!isSuccess) {
      const errorCodes = ['PAYMENT_FAILED', 'INSUFFICIENT_FUNDS', 'INVALID_PAYMENT_METHOD', 'TIMEOUT'];
      const randomError = errorCodes[Math.floor(Math.random() * errorCodes.length)];

      response.error = {
        code: randomError,
        description: randomError === 'PAYMENT_FAILED' ? 'Payment processing failed. Please try again.' :
                    randomError === 'INSUFFICIENT_FUNDS' ? 'Insufficient balance in account.' :
                    randomError === 'INVALID_PAYMENT_METHOD' ? 'Invalid payment method details.' :
                    'Payment request timed out. Please retry.',
      };
    }

    return response;
  }

  /**
   * Process a refund through the mock gateway
   */
  async processRefund(paymentId: string, amount: number): Promise<{ success: boolean; refundId?: string; error?: string }> {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 400 + Math.random() * 400));

    // 95% refund success rate
    const isSuccess = Math.random() > 0.05;

    if (isSuccess) {
      return {
        success: true,
        refundId: `mock_ref_${Date.now()}_${Math.random().toString(36).substring(7)}`,
      };
    }

    return {
      success: false,
      error: 'Refund processing failed. Please contact support.',
    };
  }

  /**
   * Verify a payment status with the gateway
   */
  async verifyPayment(transactionId: string): Promise<{ status: 'captured' | 'failed'; verifiedAt: string }> {
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 200));

    // For mock, assume all captured payments are valid
    return {
      status: transactionId.startsWith('mock_txn_') ? 'captured' : 'failed',
      verifiedAt: new Date().toISOString(),
    };
  }
}

// Singleton instance
export const mockGateway = new MockPaymentGateway();