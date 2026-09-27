import React, { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { getProviderEarnings, getProviderEarningsSummary } from '@/lib/provider-earnings';
import type { ProviderEarningWithDetails } from '@/types/payments';
import { EarningsOverview } from '@/components/providers/EarningsOverview';
import { EarningsList } from '@/components/providers/EarningsList';

export const EarningsPage: React.FC = () => {
  const { user } = useAuth();
  const [providerId, setProviderId] = useState<string | null>(null);
  const [earnings, setEarnings] = useState<ProviderEarningWithDetails[]>([]);
  const [summary, setSummary] = useState({
    pendingEarnings: 0,
    paidThisMonth: 0,
    totalAllTime: 0,
    nextPayoutDate: new Date().toISOString(),
    pendingCount: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchProviderAndEarnings = async () => {
      if (!user?.id) return;

      try {
        // Get provider ID from user
        const { data: providerData } = await import('@/lib/supabase').then(m =>
          m.supabase.from('service_providers').select('id').eq('user_id', user.id).maybeSingle()
        );

        if (!providerData) {
          setError('Provider profile not found');
          setIsLoading(false);
          return;
        }

        setProviderId(providerData.id);

        // Fetch earnings and summary in parallel
        const [earningsData, summaryData] = await Promise.all([
          getProviderEarnings(providerData.id),
          getProviderEarningsSummary(providerData.id),
        ]);

        setEarnings(earningsData as ProviderEarningWithDetails[]);
        setSummary(summaryData);
      } catch (err: any) {
        setError(err.message || 'Failed to load earnings');
      } finally {
        setIsLoading(false);
      }
    };

    fetchProviderAndEarnings();
  }, [user?.id]);

  return (
    <div className="max-w-6xl mx-auto p-4 sm:p-6">
      <h1 className="text-2xl font-bold text-slate-900 mb-2">My Earnings</h1>
      <p className="text-slate-500 mb-6">Track your earnings and payouts</p>

      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl">
          {error}
        </div>
      )}

      <div className="mb-6">
        <EarningsOverview
          pendingEarnings={summary.pendingEarnings}
          paidThisMonth={summary.paidThisMonth}
          totalAllTime={summary.totalAllTime}
          nextPayoutDate={summary.nextPayoutDate}
          pendingCount={summary.pendingCount}
          isLoading={isLoading}
        />
      </div>

      <div>
        <h2 className="text-lg font-semibold text-slate-900 mb-4">Earnings History</h2>
        <EarningsList earnings={earnings} isLoading={isLoading} />
      </div>
    </div>
  );
};

export default EarningsPage;