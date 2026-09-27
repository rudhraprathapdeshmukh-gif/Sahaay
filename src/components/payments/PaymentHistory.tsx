import React from 'react';
import type { PaymentWithDetails } from '@/types/payments';
import { formatPrice } from '@/lib/pricing';

interface PaymentHistoryProps {
  payments: PaymentWithDetails[];
  isLoading?: boolean;
}

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  pending: { label: 'Pending', className: 'bg-yellow-100 text-yellow-800' },
  processing: { label: 'Processing', className: 'bg-blue-100 text-blue-800' },
  paid: { label: 'Paid', className: 'bg-green-100 text-green-800' },
  failed: { label: 'Failed', className: 'bg-red-100 text-red-800' },
  refunded: { label: 'Refunded', className: 'bg-purple-100 text-purple-800' },
};

export const PaymentHistory: React.FC<PaymentHistoryProps> = ({
  payments,
  isLoading = false,
}) => {
  if (isLoading) {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
        <div className="animate-pulse space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 bg-slate-100 rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  if (payments.length === 0) {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 text-center">
        <div className="text-4xl mb-4">💳</div>
        <h3 className="text-lg font-semibold text-slate-900 mb-2">No Payments Yet</h3>
        <p className="text-slate-500">Your payment history will appear here after your first booking.</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="text-left text-xs font-semibold text-slate-600 uppercase tracking-wider px-6 py-4">
                Date
              </th>
              <th className="text-left text-xs font-semibold text-slate-600 uppercase tracking-wider px-6 py-4">
                Service
              </th>
              <th className="text-left text-xs font-semibold text-slate-600 uppercase tracking-wider px-6 py-4">
                Amount
              </th>
              <th className="text-left text-xs font-semibold text-slate-600 uppercase tracking-wider px-6 py-4">
                Method
              </th>
              <th className="text-left text-xs font-semibold text-slate-600 uppercase tracking-wider px-6 py-4">
                Status
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {payments.map((payment) => {
              const statusConfig = STATUS_CONFIG[payment.status] || STATUS_CONFIG.pending;

              return (
                <tr key={payment.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="text-sm font-medium text-slate-900">
                      {new Date(payment.created_at).toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </div>
                    <div className="text-xs text-slate-500">
                      {new Date(payment.created_at).toLocaleTimeString('en-IN', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm font-medium text-slate-900">
                      {payment.booking?.service?.name || 'Service'}
                    </div>
                    <div className="text-xs text-slate-500">
                      ID: {payment.booking_id.slice(0, 8)}...
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm font-bold text-slate-900">
                      {formatPrice(payment.amount)}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-slate-600 capitalize">
                      {payment.payment_method === 'net_banking' ? 'Net Banking' :
                       payment.payment_method === 'upi' ? 'UPI' :
                       payment.payment_method === 'card' ? 'Card' : 'Cash'}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusConfig.className}`}>
                      {statusConfig.label}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default PaymentHistory;