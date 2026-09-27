import React from 'react';
import { formatPrice } from '@/lib/pricing';

interface EarningsOverviewProps {
  pendingEarnings: number;
  paidThisMonth: number;
  totalAllTime: number;
  nextPayoutDate: string;
  pendingCount: number;
  isLoading?: boolean;
}

export const EarningsOverview: React.FC<EarningsOverviewProps> = ({
  pendingEarnings,
  paidThisMonth,
  totalAllTime,
  nextPayoutDate,
  pendingCount,
  isLoading = false,
}) => {
  if (isLoading) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
            <div className="h-4 bg-slate-100 rounded w-20 mb-2 animate-pulse" />
            <div className="h-8 bg-slate-100 rounded w-24 animate-pulse" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {/* Pending Earnings */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
        <div className="text-sm font-medium text-slate-500 mb-1">Pending Earnings</div>
        <div className="text-2xl font-bold text-yellow-600">{formatPrice(pendingEarnings)}</div>
        <div className="text-xs text-slate-400 mt-1">{pendingCount} service{pendingCount !== 1 ? 's' : ''} pending</div>
      </div>

      {/* Paid This Month */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
        <div className="text-sm font-medium text-slate-500 mb-1">Paid This Month</div>
        <div className="text-2xl font-bold text-green-600">{formatPrice(paidThisMonth)}</div>
        <div className="text-xs text-slate-400 mt-1">Settled to bank</div>
      </div>

      {/* Total All Time */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
        <div className="text-sm font-medium text-slate-500 mb-1">Total Earnings</div>
        <div className="text-2xl font-bold text-slate-900">{formatPrice(totalAllTime)}</div>
        <div className="text-xs text-slate-400 mt-1">All time</div>
      </div>

      {/* Next Payout */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
        <div className="text-sm font-medium text-slate-500 mb-1">Next Payout</div>
        <div className="text-2xl font-bold text-teal-600">
          {new Date(nextPayoutDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
        </div>
        <div className="text-xs text-slate-400 mt-1">Automatic transfer</div>
      </div>
    </div>
  );
};

export default EarningsOverview;