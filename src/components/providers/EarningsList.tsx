import React from 'react';
import type { ProviderEarningWithDetails } from '@/types/payments';
import { formatPrice } from '@/lib/pricing';

interface EarningsListProps {
  earnings: ProviderEarningWithDetails[];
  isLoading?: boolean;
}

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  pending: { label: 'Pending', className: 'bg-yellow-100 text-yellow-800' },
  processing: { label: 'Processing', className: 'bg-blue-100 text-blue-800' },
  completed: { label: 'Paid Out', className: 'bg-green-100 text-green-800' },
  failed: { label: 'Failed', className: 'bg-red-100 text-red-800' },
};

export const EarningsList: React.FC<EarningsListProps> = ({
  earnings,
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

  if (earnings.length === 0) {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 text-center">
        <div className="text-4xl mb-4">💰</div>
        <h3 className="text-lg font-semibold text-slate-900 mb-2">No Earnings Yet</h3>
        <p className="text-slate-500">Complete your first service to start earning.</p>
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
                Service
              </th>
              <th className="text-left text-xs font-semibold text-slate-600 uppercase tracking-wider px-6 py-4">
                Customer
              </th>
              <th className="text-left text-xs font-semibold text-slate-600 uppercase tracking-wider px-6 py-4">
                Service Amount
              </th>
              <th className="text-left text-xs font-semibold text-slate-600 uppercase tracking-wider px-6 py-4">
                Platform Fee
              </th>
              <th className="text-left text-xs font-semibold text-slate-600 uppercase tracking-wider px-6 py-4">
                Your Earning
              </th>
              <th className="text-left text-xs font-semibold text-slate-600 uppercase tracking-wider px-6 py-4">
                Status
              </th>
              <th className="text-left text-xs font-semibold text-slate-600 uppercase tracking-wider px-6 py-4">
                Payout Date
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {earnings.map((earning) => {
              const statusConfig = STATUS_CONFIG[earning.payout_status] || STATUS_CONFIG.pending;

              return (
                <tr key={earning.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="text-sm font-medium text-slate-900">
                      {earning.booking?.service?.name || 'Service'}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-slate-600">
                      {earning.booking?.customer?.full_name || 'Customer'}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm font-medium text-slate-900">
                      {formatPrice(earning.service_amount)}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-red-500">
                      -{formatPrice(earning.platform_fee)}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm font-bold text-green-600">
                      {formatPrice(earning.provider_earning)}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusConfig.className}`}>
                      {statusConfig.label}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-slate-500">
                      {earning.payout_date
                        ? new Date(earning.payout_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
                        : '-'
                      }
                    </div>
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

export default EarningsList;