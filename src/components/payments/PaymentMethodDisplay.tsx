import React from 'react';
import type { PaymentMethod } from '@/types/payments';

interface PaymentMethodDisplayProps {
  method: PaymentMethod;
  className?: string;
}

export const PaymentMethodDisplay: React.FC<PaymentMethodDisplayProps> = ({ method, className = '' }) => {
  const methodLabels: Record<PaymentMethod, { label: string; icon: string }> = {
    upi: { label: 'UPI', icon: '📱' },
    card: { label: 'Card', icon: '💳' },
    net_banking: { label: 'Net Banking', icon: '🏦' },
    cash: { label: 'Cash', icon: '💵' },
  };

  const { label, icon } = methodLabels[method];

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-700 ${className}`}>
      <span>{icon}</span>
      {label}
    </span>
  );
};

export default PaymentMethodDisplay;