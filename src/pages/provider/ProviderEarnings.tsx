import { useState, useEffect } from 'react'
import { useAuth } from '@/context/AuthContext'
import { useTranslation } from 'react-i18next'
import DashboardLayout from '@/components/DashboardLayout'
import { supabase } from '@/lib/supabase'
import { CurrencyRupeeIcon, CalendarIcon, TrendingUpIcon } from '@/components/Icons'

interface EarningsStats {
  totalEarnings: number
  completedJobs: number
  monthlyEarnings: number
  weeklyEarnings: number
  averagePerJob: number
}

interface EarningsEntry {
  id: string
  amount: number
  completed_at: string
  service_name: string
  customer_name: string
}

const ProviderEarnings = () => {
  const { user } = useAuth()
  const { t } = useTranslation()
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState<EarningsStats>({
    totalEarnings: 0,
    completedJobs: 0,
    monthlyEarnings: 0,
    weeklyEarnings: 0,
    averagePerJob: 0,
  })
  const [earnings, setEarnings] = useState<EarningsEntry[]>([])
  const [providerId, setProviderId] = useState<string | null>(null)

  const loadData = async () => {
    if (!user?.id) return

    try {
      setLoading(true)

      // Get provider ID
      const { data: provider } = await supabase
        .from('service_providers')
        .select('id')
        .eq('user_id', user.id)
        .single()

      if (!provider) {
        setLoading(false)
        return
      }

      setProviderId(provider.id)

      // Fetch completed bookings
      const { data: bookingsData, error } = await supabase
        .from('bookings')
        .select('id, amount, completed_at, service:services(name), customer:users(full_name)')
        .eq('provider_id', provider.id)
        .eq('status', 'completed')
        .order('completed_at', { ascending: false })

      if (error) throw error

      const bookings = bookingsData || []

      // Calculate statistics
      const now = new Date()
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)

      let totalEarnings = 0
      let monthlyEarnings = 0
      let weeklyEarnings = 0

      bookings.forEach((booking: any) => {
        const amount = booking.amount || 0
        totalEarnings += amount

        if (booking.completed_at) {
          const completedDate = new Date(booking.completed_at)
          if (completedDate > thirtyDaysAgo) {
            monthlyEarnings += amount
          }
          if (completedDate > sevenDaysAgo) {
            weeklyEarnings += amount
          }
        }
      })

      const averagePerJob = bookings.length > 0 ? Math.round(totalEarnings / bookings.length) : 0

      setStats({
        totalEarnings,
        completedJobs: bookings.length,
        monthlyEarnings,
        weeklyEarnings,
        averagePerJob,
      })

      // Format earnings entries
      const earningsEntries: EarningsEntry[] = bookings.map((booking: any) => ({
        id: booking.id,
        amount: booking.amount || 0,
        completed_at: booking.completed_at || new Date().toISOString(),
        service_name: booking.service?.name || 'Service',
        customer_name: booking.customer?.full_name || 'Customer',
      }))

      setEarnings(earningsEntries)
    } catch (err) {
      console.error('Failed to load earnings:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [user?.id])

  return (
    <DashboardLayout
      role="provider"
      pageTitle={t('total_earnings', 'Total Earnings')}
      pageSubtitle={t('track_your_income_and_payouts', 'Track your income and payouts')}
    >
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            {
              label: t('total_lifetime', 'Total Lifetime'),
              value: `₹${stats.totalEarnings.toLocaleString('en-IN')}`,
              icon: CurrencyRupeeIcon,
              color: '#10b981',
              bg: '#ecfdf5',
            },
            {
              label: t('monthly_earnings', 'Monthly'),
              value: `₹${stats.monthlyEarnings.toLocaleString('en-IN')}`,
              icon: TrendingUpIcon,
              color: 'var(--color-primary)',
              bg: 'var(--color-primary-tint)',
            },
            {
              label: t('weekly_earnings', 'Weekly'),
              value: `₹${stats.weeklyEarnings.toLocaleString('en-IN')}`,
              icon: CalendarIcon,
              color: '#f59e0b',
              bg: '#fffbeb',
            },
            {
              label: t('average_per_job', 'Average per Job'),
              value: `₹${stats.averagePerJob.toLocaleString('en-IN')}`,
              icon: CurrencyRupeeIcon,
              color: '#475569',
              bg: '#f1f5f9',
            },
          ].map((stat, i) => (
            <div
              key={i}
              className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm"
            >
              <div
                className="w-9 h-9 rounded-lg flex items-center justify-center mb-3"
                style={{ backgroundColor: stat.bg }}
              >
                <stat.icon className="w-5 h-5" style={{ color: stat.color }} />
              </div>
              <p
                className="text-2xl font-bold mb-1"
                style={{ color: stat.color, fontFamily: 'Plus Jakarta Sans, sans-serif' }}
              >
                {stat.value}
              </p>
              <p className="text-xs font-medium text-slate-500">{stat.label}</p>
            </div>
          ))}
        </div>

        {/* Earnings List */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
          <h2 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2">
            <CurrencyRupeeIcon className="w-5 h-5 text-emerald-600" />
            {t('earnings_history', 'Earnings History')}
          </h2>

          {loading ? (
            <div className="py-12 text-center">
              <div className="w-6 h-6 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
              <p className="text-sm text-slate-500 font-medium">{t('loading', 'Loading earnings...')}</p>
            </div>
          ) : earnings.length === 0 ? (
            <div className="py-12 text-center max-w-sm mx-auto">
              <div className="w-16 h-16 rounded-full bg-slate-50 border border-slate-100 flex items-center justify-center mx-auto mb-4">
                <CurrencyRupeeIcon className="w-7 h-7 text-slate-400" />
              </div>
              <h3 className="text-base font-bold text-slate-900 mb-1">{t('no_earnings_yet', 'No earnings yet')}</h3>
              <p className="text-sm text-slate-500">
                {t('complete_jobs_to_earn', 'Complete jobs to start earning and track your income here.')}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200">
                    <th className="text-left py-3 px-4 font-semibold text-slate-700">{t('service', 'Service')}</th>
                    <th className="text-left py-3 px-4 font-semibold text-slate-700">{t('customer', 'Customer')}</th>
                    <th className="text-left py-3 px-4 font-semibold text-slate-700">{t('date', 'Date')}</th>
                    <th className="text-right py-3 px-4 font-semibold text-slate-700">{t('amount', 'Amount')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {earnings.map((entry) => (
                    <tr key={entry.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-4 px-4 font-medium text-slate-900">{entry.service_name}</td>
                      <td className="py-4 px-4 text-slate-600">{entry.customer_name}</td>
                      <td className="py-4 px-4 text-slate-500">
                        {new Date(entry.completed_at).toLocaleDateString('en-IN', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </td>
                      <td className="py-4 px-4 text-right font-bold text-emerald-600">
                        ₹{entry.amount.toLocaleString('en-IN')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Info Box */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm text-blue-700">
          <strong>💡 Tip:</strong> Earnings are calculated from completed jobs. Request withdrawal anytime to receive your payments.
        </div>
      </div>
    </DashboardLayout>
  )
}

export default ProviderEarnings
