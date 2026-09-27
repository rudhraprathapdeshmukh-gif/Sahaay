import React, { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { getCustomerPayments } from '@/lib/payments';
import type { PaymentWithDetails } from '@/types/payments';
import { PaymentHistory } from '@/components/payments/PaymentHistory';

export const PaymentHistoryPage: React.FC = () => {
  const { user } = useAuth();
  const [payments, setPayments] = useState<PaymentWithDetails[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPayments = async () => {
      if (!user?.id) return;

      try {
        const data = await getCustomerPayments(user.id, 50);
        setPayments(data);
      } catch (err: any) {
        setError(err.message || 'Failed to load payment history');
      } finally {
        setIsLoading(false);
      }
    };

    fetchPayments();
  }, [user?.id]);

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-6">
      <h1 className="text-2xl font-bold text-slate-900 mb-2">Payment History</h1>
      <p className="text-slate-500 mb-6">View all your payments and transactions</p>

      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl">
          {error}
        </div>
      )}

      <PaymentHistory payments={payments} isLoading={isLoading} />
    </div>
  );
};

export default PaymentHistoryPage;