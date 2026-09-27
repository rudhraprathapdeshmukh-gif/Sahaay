import React, { useState } from 'react';
import { PaymentMethodSelector } from './PaymentMethodSelector';
import type { PaymentMethod } from '@/types/payments';
import { formatPrice } from '@/lib/pricing';

interface PaymentCheckoutProps {
  bookingId: string;
  amount: number;
  serviceName: string;
  platformFee: number;
  providerEarning: number;
  paymentTiming: 'upfront' | 'post_service';
  onSubmit: (paymentMethod: PaymentMethod) => Promise<void>;
  isLoading: boolean;
  error?: string;
}

export const PaymentCheckout: React.FC<PaymentCheckoutProps> = ({
  bookingId,
  amount,
  serviceName,
  platformFee,
  providerEarning,
  paymentTiming,
  onSubmit,
  isLoading,
  error,
}) => {
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | null>(null);

  const handleSubmit = async () => {
    if (!paymentMethod) return;
    await onSubmit(paymentMethod);
  };

  return (
    <div className="max-w-md mx-auto p-6 bg-white rounded-2xl shadow-lg">
      <h2 className="text-xl font-bold text-slate-900 mb-6">Payment</h2>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
          {error}
        </div>
      )}

      {/* Booking Summary */}
      <div className="mb-6 p-4 bg-slate-50 rounded-xl border border-slate-200">
        <div className="text-sm font-semibold text-slate-700 mb-2">Service Details</div>
        <div className="space-y-2">
          <div className="flex justify-between">
            <span className="text-slate-600">Booking ID</span>
            <span className="font-mono text-sm">{bookingId.slice(0, 8)}...</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-600">Service</span>
            <span className="font-semibold">{serviceName}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-600">Payment Timing</span>
            <span className="font-semibold text-teal-600">
              {paymentTiming === 'upfront' ? 'Pay Now' : 'Pay After Service'}
            </span>
          </div>
        </div>
      </div>

      {/* Amount Breakdown */}
      <div className="mb-6 p-4 bg-teal-50 rounded-xl border border-teal-200">
        <div className="text-sm font-semibold text-teal-700 mb-2">Amount Breakdown</div>
        <div className="space-y-1.5">
          <div className="flex justify-between">
            <span className="text-slate-600">Service Amount</span>
            <span className="font-medium">{formatPrice(amount)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-600">Platform Fee</span>
            <span className="text-slate-500">{formatPrice(platformFee)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-600">Provider Earning</span>
            <span className="text-emerald-600 font-medium">{formatPrice(providerEarning)}</span>
          </div>
          <div className="border-t border-teal-200 pt-1.5 mt-1.5">
            <div className="flex justify-between">
              <span className="font-semibold text-slate-900">Total Amount</span>
              <span className="text-xl font-bold text-teal-900">{formatPrice(amount)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Payment Method Selection */}
      <div className="mb-6">
        <PaymentMethodSelector
          value={paymentMethod}
          onChange={setPaymentMethod}
          disabled={isLoading}
          showCashOption={paymentTiming === 'post_service'}
        />
      </div>

      {/* Submit Button */}
      <button
        onClick={handleSubmit}
        disabled={!paymentMethod || isLoading}
        className="w-full py-4 bg-teal-600 hover:bg-teal-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white rounded-xl font-bold text-lg transition-colors shadow-lg shadow-teal-900/20"
      >
        {isLoading ? (
          <span className="flex items-center justify-center gap-2">
            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            Processing Payment...
          </span>
        ) : paymentTiming === 'upfront' ? (
          `Pay ${formatPrice(amount)} Now`
        ) : (
          'Confirm Payment Method'
        )}
      </button>

      {/* Security note */}
      <p className="text-xs text-slate-500 text-center mt-4">
        🔒 Your payment is secure and encrypted
      </p>
    </div>
  );
};

export default PaymentCheckout;