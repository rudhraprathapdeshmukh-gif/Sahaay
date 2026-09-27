import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import DashboardLayout from '@/components/DashboardLayout'
import { supabase } from '@/lib/supabase'
import {
  UsersIcon, WrenchIcon, BookOpenIcon,
  CurrencyRupeeIcon, AlertCircleIcon, CheckCircleIcon,
  ChartBarIcon, CalendarIcon
} from '@/components/Icons'

type TabType = 'overview' | 'users' | 'providers' | 'bookings' | 'details'

interface DashboardStats {
  totalUsers: number
  serviceProviders: number
  totalBookings: number
  totalRevenue: number
  pendingVerifications: number
  activeBookings: number
  completedBookings: number
}

interface User {
  id: string
  full_name: string
  email: string
  phone: string | null
  role: string
  created_at: string
  status?: string
  avatar_url?: string
}

interface Provider {
  id: string
  user_id: string
  full_name: string
  email: string
  phone: string | null
  service_name: string
  verification_status: string
  years_experience: string | null
  bio: string | null
  certificate_url: string | null
  created_at: string
  rating: number | null
  jobs_completed: number
}

interface Booking {
  id: string
  service_name: string
  customer_name: string | null
  provider_name: string | null
  amount: number
  status: string
  created_at: string
  scheduled_date: string | null
  customer?: {
    full_name: string | null
  } | null
  provider?: {
    user_id: string
  } | null
}

interface PlatformDetails {
  totalServices: number
  totalSkills: number
  avgBookingAmount: number
  completionRate: number
}

const AdminDashboard = () => {
  const { t } = useTranslation()
  const [activeTab, setActiveTab] = useState<TabType>('overview')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Overview stats
  const [stats, setStats] = useState<DashboardStats>({
    totalUsers: 0,
    serviceProviders: 0,
    totalBookings: 0,
    totalRevenue: 0,
    pendingVerifications: 0,
    activeBookings: 0,
    completedBookings: 0
  })

  // Platform details
  const [platformDetails, setPlatformDetails] = useState<PlatformDetails>({
    totalServices: 0,
    totalSkills: 0,
    avgBookingAmount: 0,
    completionRate: 0
  })

  // Users tab data
  const [users, setUsers] = useState<User[]>([])
  const [userSearchTerm, setUserSearchTerm] = useState('')
  const [userRoleFilter, setUserRoleFilter] = useState<string>('all')

  // Providers tab data
  const [providers, setProviders] = useState<Provider[]>([])
  const [providerSearchTerm, setProviderSearchTerm] = useState('')
  const [providerStatusFilter, setProviderStatusFilter] = useState<string>('all')

  // Bookings tab data
  const [bookings, setBookings] = useState<Booking[]>([])
  const [bookingSearchTerm, setBookingSearchTerm] = useState('')
  const [bookingStatusFilter, setBookingStatusFilter] = useState<string>('all')

  // Bookings data for recent activity in overview
  const [bookingsData, setBookingsData] = useState<{ data: any[] | null }>({
    data: null
  })

  const formatCurrency = (amount: number): string => {
    if (amount >= 10000000) return `₹${(amount / 10000000).toFixed(2)} Cr`
    if (amount >= 100000) return `₹${(amount / 100000).toFixed(2)} L`
    return `₹${amount.toLocaleString()}`
  }

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
  }

  // Fetch overview stats
  useEffect(() => {
    const fetchOverviewStats = async () => {
      try {
        const [usersData, providersData, bookingsData, pendingVerificationsData] = await Promise.all([
          supabase.from('users').select('id', { count: 'exact' }),
          supabase.from('service_providers').select('id', { count: 'exact' }),
          supabase.from('bookings').select('amount, status, customer:users!bookings_customer_id_fkey(full_name), provider:service_providers!bookings_provider_id_fkey(user_id)'),
          supabase.from('service_providers').select('id', { count: 'exact' }).eq('verification_status', 'pending')
        ])

        const totalRevenue = bookingsData.data?.reduce((sum, b) => sum + (b.amount || 0), 0) || 0
        const totalBookings = bookingsData.data?.length || 0
        const activeBookings = bookingsData.data?.filter(b => b.status === 'Pending' || b.status === 'Confirmed' || b.status === 'In Progress').length || 0
        const completedBookings = bookingsData.data?.filter(b => b.status === 'Completed').length || 0

        setStats({
          totalUsers: usersData.count || 0,
          serviceProviders: providersData.count || 0,
          totalBookings: totalBookings,
          totalRevenue,
          pendingVerifications: pendingVerificationsData.count || 0,
          activeBookings,
          completedBookings
        })

        // Set bookings data for recent activity
        setBookingsData({ data: bookingsData.data || null })
      } catch (err) {
        console.error('Error fetching overview stats:', err)
      }
    }

    fetchOverviewStats()
  }, [])

  // Fetch users data for users tab
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        setLoading(true)
        setError(null)

        const { data, error } = await supabase
          .from('users')
          .select('id, full_name, email, phone, role, created_at, status')
          .order('created_at', { ascending: false })

        if (error) throw error
        setUsers(data || [])
      } catch (err) {
        console.error('Error fetching users:', err)
        setError('Failed to load users. Please try again.')
      } finally {
        setLoading(false)
      }
    }

    fetchUsers()
  }, [activeTab]) // Only fetch when users tab is active

  // Fetch data based on active tab
  useEffect(() => {
    const fetchTabData = async () => {
      setLoading(true)
      setError(null)

      try {
        if (activeTab === 'users') {
          const { data, error } = await supabase
            .from('users')
            .select('id, full_name, email, phone, role, created_at')
            .order('created_at', { ascending: false })

          if (error) throw error
          setUsers(data || [])
        } else if (activeTab === 'providers') {
          const { data, error } = await supabase
            .from('service_providers')
            .select(`
              id,
              user_id,
              service_name,
              verification_status,
              years_experience,
              bio,
              certificate_url,
              created_at,
              rating,
              jobs_completed,
              users!service_providers_user_id_fkey(full_name, email, phone)
            `)
            .order('created_at', { ascending: false })

          if (error) throw error

          const processedProviders = data?.map(p => {
            const user = p.users as any
            return {
              id: p.id,
              user_id: p.user_id,
              full_name: user?.full_name || 'Unknown',
              email: user?.email || '',
              phone: user?.phone || null,
              service_name: p.service_name,
              verification_status: p.verification_status,
              years_experience: p.years_experience,
              bio: p.bio,
              certificate_url: p.certificate_url,
              created_at: p.created_at,
              rating: p.rating,
              jobs_completed: p.jobs_completed
            }
          }) || []

          setProviders(processedProviders)
        } else if (activeTab === 'bookings') {
          const { data, error } = await supabase
            .from('bookings')
            .select(`
              id,
              service_name,
              amount,
              status,
              created_at,
              scheduled_date,
              customer:users!bookings_customer_id_fkey(full_name),
              provider:service_providers!bookings_provider_id_fkey(user_id),
              provider_user:users!service_providers_user_id_fkey(full_name)
            `)
            .order('created_at', { ascending: false })

          if (error) throw error

          const processedBookings: Booking[] = []
          if (data) {
            data.forEach(item => {
              const customer = item.customer as any
              const providerUser = item.provider_user as any
              processedBookings.push({
                id: item.id,
                service_name: item.service_name || 'Service',
                customer_name: customer?.full_name || null,
                provider_name: providerUser?.full_name || null,
                amount: item.amount || 0,
                status: item.status,
                created_at: item.created_at,
                scheduled_date: item.scheduled_date
              })
            })
          }

          setBookings(processedBookings)
        } else if (activeTab === 'details') {
          const [servicesData, bookingsData] = await Promise.all([
            supabase.from('services').select('id', { count: 'exact' }),
            supabase.from('bookings').select('amount, status')
          ])

          const totalBookings = bookingsData.data?.length || 0
          const completedBookings = bookingsData.data?.filter(b => b.status === 'Completed').length || 0
          const totalAmount = bookingsData.data?.reduce((sum, b) => sum + (b.amount || 0), 0) || 0

          setPlatformDetails({
            totalServices: servicesData.count || 0,
            totalSkills: servicesData.count || 0,
            avgBookingAmount: totalBookings > 0 ? totalAmount / totalBookings : 0,
            completionRate: totalBookings > 0 ? (completedBookings / totalBookings) * 100 : 0
          })
        }
      } catch (err) {
        console.error(`Error fetching ${activeTab} data:`, err)
        setError(`Failed to load ${activeTab} data. Please try again.`)
      } finally {
        setLoading(false)
      }
    }

    if (activeTab !== 'overview') {
      fetchTabData()
    } else {
      setLoading(false)
    }
  }, [activeTab])

  // Filter functions
  const filteredUsers = users.filter(user => {
    const matchesSearch = user.full_name.toLowerCase().includes(userSearchTerm.toLowerCase()) ||
                         user.email.toLowerCase().includes(userSearchTerm.toLowerCase())
    const matchesRole = userRoleFilter === 'all' || user.role === userRoleFilter
    return matchesSearch && matchesRole
  })

  const filteredProviders = providers.filter(provider => {
    const matchesSearch = provider.full_name.toLowerCase().includes(providerSearchTerm.toLowerCase()) ||
                         provider.service_name.toLowerCase().includes(providerSearchTerm.toLowerCase())
    const matchesStatus = providerStatusFilter === 'all' || provider.verification_status === providerStatusFilter
    return matchesSearch && matchesStatus
  })

  const filteredBookings = bookings.filter(booking => {
    const matchesSearch = booking.service_name.toLowerCase().includes(bookingSearchTerm.toLowerCase()) ||
                         booking.customer_name?.toLowerCase().includes(bookingSearchTerm.toLowerCase()) ||
                         booking.provider_name?.toLowerCase().includes(bookingSearchTerm.toLowerCase())
    const matchesStatus = bookingStatusFilter === 'all' || booking.status === bookingStatusFilter
    return matchesSearch && matchesStatus
  })

  const tabs = [
    { id: 'overview', label: t('overview', 'Overview'), icon: ChartBarIcon },
    { id: 'users', label: t('total_users', 'Total Users'), icon: UsersIcon },
    { id: 'providers', label: t('service_providers', 'Service Providers'), icon: WrenchIcon },
    { id: 'bookings', label: t('my_bookings', 'My Bookings'), icon: BookOpenIcon },
    { id: 'details', label: t('details', 'Details'), icon: CurrencyRupeeIcon }
  ]

  return (
    <DashboardLayout role="admin" pageTitle={t('admin_dashboard', 'Admin Dashboard')} pageSubtitle={t('platform_management', 'Platform management and analytics.')}>
      {/* Tab Navigation */}
      <div className="mb-6 bg-white rounded-xl border border-slate-200 p-1 flex gap-1 overflow-x-auto">
        {tabs.map(tab => {
          const Icon = tab.icon
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as TabType)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium whitespace-nowrap transition-all"
              style={{
                backgroundColor: activeTab === tab.id ? 'var(--color-primary)' : 'transparent',
                color: activeTab === tab.id ? '#fff' : '#64748b'
              }}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          )
        })}
      </div>

      {/* Tab Content */}
      {loading && activeTab !== 'overview' ? (
        <div className="flex flex-col items-center justify-center py-16 bg-white rounded-xl border border-slate-200">
          <div className="w-8 h-8 border-4 border-slate-800 border-t-transparent rounded-full animate-spin mb-3" />
          <p className="text-xs text-slate-500 font-medium">{t('loading', 'Loading...')}</p>
        </div>
      ) : error ? (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm flex items-center gap-3">
          <AlertCircleIcon className="w-5 h-5 flex-shrink-0" style={{ color: '#dc2626' }} />
          <span>{error}</span>
        </div>
      ) : (
        <>
          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white rounded-xl border border-slate-200 p-6">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{backgroundColor: 'var(--color-primary-tint)'}}>
                    <UsersIcon className="w-5 h-5" style={{color: 'var(--color-primary)'}} />
                  </div>
                </div>
                <p className="text-3xl font-bold text-slate-900">{stats.totalUsers.toLocaleString()}</p>
                <p className="text-sm text-slate-600 mt-1">{t('total_users', 'Total Users')}</p>
              </div>

              <div className="bg-white rounded-xl border border-slate-200 p-6">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{backgroundColor: 'var(--color-accent-tint)'}}>
                    <WrenchIcon className="w-5 h-5" style={{color: 'var(--color-accent)'}} />
                  </div>
                </div>
                <p className="text-3xl font-bold text-slate-900">{stats.serviceProviders.toLocaleString()}</p>
                <p className="text-sm text-slate-600 mt-1">{t('service_providers', 'Service Providers')}</p>
              </div>

              <div className="bg-white rounded-xl border border-slate-200 p-6">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{backgroundColor: '#dbeafe'}}>
                    <BookOpenIcon className="w-5 h-5" style={{color: '#2563eb'}} />
                  </div>
                </div>
                <p className="text-3xl font-bold text-slate-900">{stats.totalBookings.toLocaleString()}</p>
                <p className="text-sm text-slate-600 mt-1">{t('total_bookings', 'Total Bookings')}</p>
              </div>

              <div className="bg-white rounded-xl border border-slate-200 p-6">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{backgroundColor: '#dcfce7'}}>
                    <CurrencyRupeeIcon className="w-5 h-5" style={{color: '#16a34a'}} />
                  </div>
                </div>
                <p className="text-3xl font-bold text-slate-900">{formatCurrency(stats.totalRevenue)}</p>
                <p className="text-sm text-slate-600 mt-1">{t('total_revenue', 'Total Revenue')}</p>
              </div>

              <div className="bg-white rounded-xl border border-slate-200 p-6">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{backgroundColor: '#fee2e2'}}>
                    <AlertCircleIcon className="w-5 h-5" style={{color: '#dc2626'}} />
                  </div>
                </div>
                <p className="text-3xl font-bold text-slate-900">{stats.pendingVerifications.toLocaleString()}</p>
                <p className="text-sm text-slate-600 mt-1">{t('pending_verifications', 'Pending Verifications')}</p>
              </div>

              <div className="bg-white rounded-xl border border-slate-200 p-6">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{backgroundColor: '#dbeafe'}}>
                    <CalendarIcon className="w-5 h-5" style={{color: '#2563eb'}} />
                  </div>
                </div>
                <p className="text-3xl font-bold text-slate-900">{stats.activeBookings.toLocaleString()}</p>
                <p className="text-sm text-slate-600 mt-1">{t('active_bookings', 'Active Bookings')}</p>
              </div>

              <div className="bg-white rounded-xl border border-slate-200 p-6">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{backgroundColor: '#bbf7d0'}}>
                    <CheckCircleIcon className="w-5 h-5" style={{color: '#16a34a'}} />
                  </div>
                </div>
                <p className="text-3xl font-bold text-slate-900">{stats.completedBookings.toLocaleString()}</p>
                <p className="text-sm text-slate-600 mt-1">{t('completed_bookings', 'Completed Bookings')}</p>
              </div>
            </div>

            {/* Recent Activity */}
            <div className="mt-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-semibold text-slate-900">{t('recent_activity', 'Recent Activity')}</h2>
                <Link to="/admin/bookings" className="text-sm text-primary hover:underline">
                  {t('view_all', 'View All')} →
                </Link>
              </div>
              <div className="space-y-3">
                {/* Recent bookings */}
                {bookingsData && bookingsData.data ? (
                  bookingsData.data
                    .slice(0, 5)
                    .map((booking: any) => (
                      <div key={booking.id} className="flex items-center gap-4 p-3 bg-slate-50 rounded-lg">
                        <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-blue-50">
                          <CalendarIcon className="w-5 h-5" style={{color: '#2563eb'}} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-slate-900">{booking.service_name || 'Service'}</p>
                          <p className="text-xs text-slate-500">
                            {booking.customer_name || 'Customer'} → {booking.provider_name || 'Provider'}
                          </p>
                        </div>
                        <div className="text-xs">
                          <span className={
                            'px-2 py-0.5 text-xs font-semibold rounded-full ' +
                            (booking.status === 'Completed' ? 'bg-green-100 text-green-700' :
                             booking.status === 'In Progress' ? 'bg-blue-100 text-blue-700' :
                             booking.status === 'Confirmed' ? 'bg-purple-100 text-purple-700' :
                             'bg-yellow-100 text-yellow-700')
                          }>
                            {booking.status}
                          </span>
                          <br />
                          <span className="text-slate-400">{formatDate(booking.created_at)}</span>
                        </div>
                      </div>
                    ))
                ) : (
                  <div className="text-center py-8 text-slate-500">
                    {t('no_recent_activity', 'No recent activity')}
                  </div>
                )}
              </div>
            </div>
          </div>
          )}

          {/* Users Tab */}
          {activeTab === 'users' && (
            <div className="bg-white rounded-xl border border-slate-200">
              <div className="p-6 border-b border-slate-200">
                <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
                  <div className="flex-1 sm:flex-none sm:w-[200px]">
                    <input
                      type="text"
                      placeholder={t('search_users', 'Search users...')}
                      value={userSearchTerm}
                      onChange={(e) => setUserSearchTerm(e.target.value)}
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                  <div className="flex-1 sm:flex-none sm:w-[200px]">
                    <select
                      value={userRoleFilter}
                      onChange={(e) => setUserRoleFilter(e.target.value)}
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                    >
                      <option value="all">{t('all_roles', 'All Roles')}</option>
                      <option value="customer">{t('customer', 'Customer')}</option>
                      <option value="service_provider">{t('service_providers', 'Service Providers')}</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                        {t('avatar', 'Avatar')}
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                        {t('name', 'Name')}
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                        {t('email', 'Email')}
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                        {t('phone', 'Phone')}
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                        {t('role', 'Role')}
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                        {t('status', 'Status')}
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                        {t('joined', 'Joined')}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {filteredUsers.map(user => (
                      <tr key={user.id} className="hover:bg-slate-50">
                        <td className="px-6 py-4 flex items-center gap-3">
                          {user.avatar_url ? (
                            <img
                              src={user.avatar_url}
                              alt={`${user.full_name}'s avatar`}
                              className="w-10 h-10 rounded-full object-cover border border-slate-200"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-full flex items-center justify-center bg-slate-200 text-slate-500">
                              {user.full_name ? user.full_name.charAt(0).toUpperCase() : '?'}
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-slate-900">{user.full_name || 'Unnamed'}</p>
                            {user.email && <p className="text-xs text-slate-500">{user.email}</p>}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-600">{user.email}</td>
                        <td className="px-6 py-4 text-sm text-slate-600">{user.phone || 'N/A'}</td>
                        <td className="px-6 py-4">
                          <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                            user.role === 'admin' ? 'bg-purple-100 text-purple-700' :
                            user.role === 'service_provider' ? 'bg-green-100 text-green-700' :
                            'bg-blue-100 text-blue-700'
                          }`}>
                            {user.role === 'service_provider' ? t('service_provider', 'Service Provider') :
                             user.role === 'customer' ? t('customer', 'Customer') :
                             user.role === 'admin' ? t('admin', 'Admin') : user.role}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                            user.status === 'active' ? 'bg-green-100 text-green-700' :
                            user.status === 'inactive' ? 'bg-red-100 text-red-700' :
                            user.status === 'suspended' ? 'bg-yellow-100 text-yellow-700' :
                            'bg-slate-100 text-slate-700'
                          }`}>
                            {user.status || t('active', 'Active')}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-600">{formatDate(user.created_at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {filteredUsers.length === 0 && (
                  <div className="p-8 text-center text-slate-500">{t('no_users_found', 'No users found')}</div>
                )}
              </div>
            </div>
          )}

          {/* Providers Tab */}
          {activeTab === 'providers' && (
            <div className="bg-white rounded-xl border border-slate-200">
              <div className="p-6 border-b border-slate-200">
                <div className="flex flex-col sm:flex-row gap-4">
                  <input
                    type="text"
                    placeholder={t('search_providers', 'Search providers...')}
                    value={providerSearchTerm}
                    onChange={(e) => setProviderSearchTerm(e.target.value)}
                    className="flex-1 px-4 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                  <select
                    value={providerStatusFilter}
                    onChange={(e) => setProviderStatusFilter(e.target.value)}
                    className="px-4 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="all">{t('all_statuses', 'All Statuses')}</option>
                    <option value="verified">{t('verified', 'Verified')}</option>
                    <option value="pending">{t('pending', 'Pending')}</option>
                    <option value="unverified">{t('unverified', 'Unverified')}</option>
                    <option value="rejected">{t('rejected', 'Rejected')}</option>
                  </select>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">{t('name', 'Name')}</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">{t('service', 'Service')}</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">{t('status', 'Status')}</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">{t('experience', 'Experience')}</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">{t('jobs_completed', 'Jobs')}</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">{t('joined', 'Joined')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {filteredProviders.map(provider => (
                      <tr key={provider.id} className="hover:bg-slate-50">
                        <td className="px-6 py-4 text-sm font-medium text-slate-900">{provider.full_name}</td>
                        <td className="px-6 py-4 text-sm text-slate-600">{provider.service_name}</td>
                        <td className="px-6 py-4">
                          <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                            provider.verification_status === 'verified' ? 'bg-green-100 text-green-700' :
                            provider.verification_status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                            provider.verification_status === 'rejected' ? 'bg-red-100 text-red-700' :
                            'bg-gray-100 text-gray-700'
                          }`}>
                            {provider.verification_status}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-600">{provider.years_experience || 'N/A'}</td>
                        <td className="px-6 py-4 text-sm text-slate-600">{provider.jobs_completed}</td>
                        <td className="px-6 py-4 text-sm text-slate-600">{formatDate(provider.created_at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {filteredProviders.length === 0 && (
                  <div className="p-8 text-center text-slate-500">{t('no_providers_found', 'No providers found')}</div>
                )}
              </div>
            </div>
          )}

          {/* Bookings Tab */}
          {activeTab === 'bookings' && (
            <div className="bg-white rounded-xl border border-slate-200">
              <div className="p-6 border-b border-slate-200">
                <div className="flex flex-col sm:flex-row gap-4">
                  <input
                    type="text"
                    placeholder={t('search_bookings', 'Search bookings...')}
                    value={bookingSearchTerm}
                    onChange={(e) => setBookingSearchTerm(e.target.value)}
                    className="flex-1 px-4 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                  <select
                    value={bookingStatusFilter}
                    onChange={(e) => setBookingStatusFilter(e.target.value)}
                    className="px-4 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="all">{t('all_statuses', 'All Statuses')}</option>
                    <option value="Pending">{t('pending', 'Pending')}</option>
                    <option value="Confirmed">{t('confirmed', 'Confirmed')}</option>
                    <option value="In Progress">{t('in_progress', 'In Progress')}</option>
                    <option value="Completed">{t('completed', 'Completed')}</option>
                    <option value="Cancelled">{t('cancelled', 'Cancelled')}</option>
                  </select>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">{t('service', 'Service')}</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">{t('customer', 'Customer')}</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">{t('provider', 'Provider')}</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">{t('amount', 'Amount')}</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">{t('status', 'Status')}</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">{t('created', 'Created')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {filteredBookings.map(booking => (
                      <tr key={booking.id} className="hover:bg-slate-50">
                        <td className="px-6 py-4 text-sm font-medium text-slate-900">{booking.service_name}</td>
                        <td className="px-6 py-4 text-sm text-slate-600">{booking.customer_name || 'Customer'}</td>
                        <td className="px-6 py-4 text-sm text-slate-600">{booking.provider_name || 'Provider'}</td>
                        <td className="px-6 py-4 text-sm font-semibold text-slate-900">₹{booking.amount.toLocaleString()}</td>
                        <td className="px-6 py-4">
                          <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                            booking.status === 'Completed' ? 'bg-green-100 text-green-700' :
                            booking.status === 'In Progress' ? 'bg-blue-100 text-blue-700' :
                            booking.status === 'Confirmed' ? 'bg-purple-100 text-purple-700' :
                            booking.status === 'Pending' ? 'bg-yellow-100 text-yellow-700' :
                            'bg-red-100 text-red-700'
                          }`}>
                            {booking.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-600">{formatDate(booking.created_at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {filteredBookings.length === 0 && (
                  <div className="p-8 text-center text-slate-500">{t('no_bookings_found', 'No bookings found')}</div>
                )}
              </div>
            </div>
          )}

          {/* Details Tab */}
          {activeTab === 'details' && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white rounded-xl border border-slate-200 p-6">
                  <p className="text-sm text-slate-600 mb-2">{t('total_services', 'Total Services')}</p>
                  <p className="text-3xl font-bold text-slate-900">{platformDetails.totalServices}</p>
                </div>

                <div className="bg-white rounded-xl border border-slate-200 p-6">
                  <p className="text-sm text-slate-600 mb-2">{t('total_skills', 'Total Skills')}</p>
                  <p className="text-3xl font-bold text-slate-900">{platformDetails.totalSkills}</p>
                </div>

                <div className="bg-white rounded-xl border border-slate-200 p-6">
                  <p className="text-sm text-slate-600 mb-2">{t('avg_booking_amount', 'Avg Booking')}</p>
                  <p className="text-3xl font-bold text-slate-900">{formatCurrency(platformDetails.avgBookingAmount)}</p>
                </div>

                <div className="bg-white rounded-xl border border-slate-200 p-6">
                  <p className="text-sm text-slate-600 mb-2">{t('completion_rate', 'Completion Rate')}</p>
                  <p className="text-3xl font-bold text-slate-900">{platformDetails.completionRate.toFixed(1)}%</p>
                </div>
              </div>

              <div className="bg-white rounded-xl border border-slate-200 p-6">
                <h3 className="text-lg font-semibold text-slate-900 mb-4">{t('platform_info', 'Platform Information')}</h3>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between py-2 border-b border-slate-100">
                    <span className="text-slate-600">{t('platform_name', 'Platform Name')}</span>
                    <span className="font-medium text-slate-900">Sahaay</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-slate-100">
                    <span className="text-slate-600">{t('version', 'Version')}</span>
                    <span className="font-medium text-slate-900">1.0.0</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-slate-100">
                    <span className="text-slate-600">{t('total_users', 'Total Users')}</span>
                    <span className="font-medium text-slate-900">{stats.totalUsers}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-slate-100">
                    <span className="text-slate-600">{t('total_providers', 'Total Providers')}</span>
                    <span className="font-medium text-slate-900">{stats.serviceProviders}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-slate-100">
                    <span className="text-slate-600">{t('total_revenue', 'Total Revenue')}</span>
                    <span className="font-medium text-slate-900">{formatCurrency(stats.totalRevenue)}</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </DashboardLayout>
  )
}

export default AdminDashboard
