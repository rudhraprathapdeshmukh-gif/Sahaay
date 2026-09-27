import React from 'react';
import type { PaymentMethod } from '@/types/payments';

interface PaymentMethodSelectorProps {
  value: PaymentMethod | null;
  onChange: (method: PaymentMethod) => void;
  disabled?: boolean;
  showCashOption?: boolean;
}

const PAYMENT_METHODS: Array<{
  value: PaymentMethod;
  label: string;
  description: string;
  icon: string;
}> = [
  { value: 'upi', label: 'UPI', description: 'Pay using Google Pay, PhonePe, Paytm', icon: '📱' },
  { value: 'card', label: 'Credit/Debit Card', description: 'Visa, Mastercard, RuPay', icon: '💳' },
  { value: 'net_banking', label: 'Net Banking', description: 'All major Indian banks', icon: '🏦' },
];

const CASH_METHOD = { value: 'cash' as const, label: 'Cash on Service', description: 'Pay in cash after service completion', icon: '💵' };

export const PaymentMethodSelector: React.FC<PaymentMethodSelectorProps> = ({
  value,
  onChange,
  disabled = false,
  showCashOption = false,
}) => {
  const methods = showCashOption
    ? [...PAYMENT_METHODS, CASH_METHOD]
    : PAYMENT_METHODS;

  return (
    <div className="space-y-3">
      <div className="text-sm font-semibold text-slate-700 mb-2">Select Payment Method</div>
      <div className="grid grid-cols-2 gap-3">
        {methods.map((method) => (
          <button
            key={method.value}
            type="button"
            onClick={() => !disabled && onChange(method.value)}
            disabled={disabled}
            className={`p-4 border-2 rounded-xl text-left transition-all ${
              value === method.value
                ? 'border-teal-500 bg-teal-50 shadow-sm'
                : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
            } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
          >
            <div className="flex items-center gap-3">
              <div className="text-2xl">{method.icon}</div>
              <div className="flex-1">
                <div className="font-semibold text-slate-900">{method.label}</div>
                <div className="text-xs text-slate-500 mt-0.5">{method.description}</div>
              </div>
              {value === method.value && (
                <div className="w-5 h-5 bg-teal-500 rounded-full flex items-center justify-center">
                  <div className="w-2 h-2 bg-white rounded-full" />
                </div>
              )}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};

export default PaymentMethodSelector;