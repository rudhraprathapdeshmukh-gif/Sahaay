import React from 'react';
import type { Payment } from '@/types/payments';
import { formatPrice } from '@/lib/pricing';

interface ReceiptModalProps {
  payment: Payment;
  onClose: () => void;
}

export const ReceiptModal: React.FC<ReceiptModalProps> = ({ payment, onClose }) => {
  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-600"
        >
          ✕
        </button>

        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-3xl">✓</span>
          </div>
          <h2 className="text-2xl font-bold text-slate-900">Payment Successful!</h2>
          <p className="text-slate-500 mt-1">Your payment has been processed</p>
        </div>

        <div className="bg-slate-50 rounded-xl p-4 space-y-3">
          <div className="flex justify-between">
            <span className="text-slate-600">Transaction ID</span>
            <span className="font-mono text-sm">{payment.gateway_transaction_id?.slice(0, 16)}...</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-600">Amount Paid</span>
            <span className="font-bold text-green-600">{formatPrice(payment.amount)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-600">Payment Method</span>
            <span className="capitalize">{payment.payment_method.replace('_', ' ')}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-600">Date</span>
            <span className="text-sm">
              {payment.paid_at ? new Date(payment.paid_at).toLocaleDateString('en-IN') : '-'}
            </span>
          </div>
        </div>

        <button
          onClick={onClose}
          className="w-full mt-6 py-3 bg-teal-600 hover:bg-teal-700 text-white rounded-xl font-semibold transition-colors"
        >
          Done
        </button>
      </div>
    </div>
  );
};

export default ReceiptModal;