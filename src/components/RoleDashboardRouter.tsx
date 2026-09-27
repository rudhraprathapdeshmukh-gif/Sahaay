import { Navigate, useLocation, Routes, Route } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import CustomerDashboard from '@/pages/customer/CustomerDashboard'
import ProviderDashboard from '@/pages/provider/ProviderDashboard'
import AdminDashboard from '@/pages/admin/AdminDashboard'
import ProviderProfilePage from '@/pages/provider/ProviderProfilePage'
import CustomerBookingsPage from '@/pages/customer/CustomerBookings'
import VerificationQueue from '@/pages/admin/VerificationQueue'

// Customer pages
import CustomerRequestServicePage from '@/pages/customer/CustomerRequestService'
import CustomerHistoryPage from '@/pages/customer/CustomerHistoryPage'
import CustomerProfilePage from '@/pages/customer/CustomerProfilePage'
import CustomerNotifications from '@/pages/customer/CustomerNotifications'
import HelpSupportPage from '@/pages/customer/HelpSupportPage'

// Provider pages
import ProviderRequests from '@/pages/provider/ProviderRequests'
import ProviderBookings from '@/pages/provider/ProviderBookings'
import ProviderEarnings from '@/pages/provider/ProviderEarnings'
import ProviderNotifications from '@/pages/provider/ProviderNotifications'

import PlaceholderPage from './PlaceholderPage'
import {
  CalendarIcon, BellIcon, UserIcon,
  ClipboardListIcon, CurrencyRupeeIcon,
  UsersIcon, WrenchIcon, ShieldCheckIcon, BookOpenIcon, ChartBarIcon
} from './Icons'

// Each role's set of sub-routes
const customerRoutes: Record<string, { title: string; subtitle?: string; description: string; icon?: React.FC<{ className?: string }> }> = {
  default: {
    title: 'Customer Dashboard',
    description: 'Track your bookings, manage your profile, and stay up to date.',
  },
  request: {
    title: 'Request Service',
    subtitle: 'Submit a new service request',
    description: 'Choose a service category, select subcategory, set your schedule, and submit your request to the provider pool.',
    icon: WrenchIcon,
  },
    bookings: {
    title: 'My Bookings',
    subtitle: 'Track upcoming and past service bookings',
    description: 'View all your bookings — past, present, and upcoming. Reschedule, cancel, or rate completed services.',
    icon: CalendarIcon,
  },
  history: {
    title: 'Requests/History',
    subtitle: 'See your booking request history',
    description: 'Review your past booking requests and historical service activities.',
    icon: ClipboardListIcon,
  },
  notifications: {
    title: 'Messages & Alerts',
    subtitle: 'Updates on your bookings and messages',
    description: 'Stay updated with booking confirmations, provider messages, and important platform updates.',
    icon: BellIcon,
  },
  'help-support': {
    title: 'Help & Support',
    subtitle: 'FAQs, how it works, and contact support',
    description: 'Browse frequently asked questions, learn how Sahaay works, and get in touch with our support team.',
    icon: WrenchIcon,
  },
  profile: {
    title: 'My Profile',
    subtitle: 'Manage your personal information',
    description: 'Update your contact details, addresses, and account preferences.',
    icon: UserIcon,
  },
}

const providerRoutes: Record<string, { title: string; subtitle?: string; description: string; icon?: React.FC<{ className?: string }> }> = {
  default: {
    title: 'Provider Dashboard',
    description: 'Manage your service requests, bookings, earnings, and profile.',
  },
  requests: {
    title: 'Pending Requests',
    subtitle: 'New jobs from customers near you',
    description: 'Review and accept incoming service requests. View job details, location, and customer info before accepting.',
    icon: ClipboardListIcon,
  },
  bookings: {
    title: 'My Bookings',
    subtitle: 'Active and scheduled jobs',
    description: 'Track your accepted jobs, mark them as in-progress, and complete them when done.',
    icon: CalendarIcon,
  },
  earnings: {
    title: 'Total Earnings',
    subtitle: 'Track your income and payouts',
    description: 'See your earnings history, pending payouts, and weekly/monthly summaries. Request withdrawal anytime.',
    icon: CurrencyRupeeIcon,
  },
  profile: {
    title: 'My Profile',
    subtitle: 'Showcase your skills to customers',
    description: 'Manage your bio, services, experience, and credentials visible to potential customers.',
    icon: UserIcon,
  },
  notifications: {
    title: 'Messages & Alerts',
    subtitle: 'Updates on new jobs and customers',
    description: 'Get notified about new requests, customer messages, and important platform updates.',
    icon: BellIcon,
  },
}

const adminRoutes: Record<string, { title: string; subtitle?: string; description: string; icon?: React.FC<{ className?: string }> }> = {
  default: {
    title: 'Admin Overview',
    description: 'Monitor platform health, manage users, providers, and bookings.',
  },
  users: {
    title: 'Users',
    subtitle: 'Manage all customers on the platform',
    description: 'View, search, and manage customer accounts. Handle support tickets, suspensions, and account verification.',
    icon: UsersIcon,
  },
  providers: {
    title: 'Service Providers',
    subtitle: 'Manage all service providers',
    description: 'View, search, and manage service provider accounts. Review performance, ratings, and activity.',
    icon: WrenchIcon,
  },
  verification: {
    title: 'Verification Queue',
    subtitle: 'Approve new service providers',
    description: 'Review pending provider applications. Verify documents, approve or reject applications.',
    icon: ShieldCheckIcon,
  },
  bookings: {
    title: 'All Bookings',
    subtitle: 'Monitor all platform bookings',
    description: 'View and manage all bookings across the platform. Track revenue, dispute resolution, and refunds.',
    icon: BookOpenIcon,
  },
  reports: {
    title: 'Reports & Analytics',
    subtitle: 'Platform performance insights',
    description: 'Generate reports on bookings, revenue, user growth, provider performance, and other key metrics.',
    icon: ChartBarIcon,
  },
}

interface RoleDashboardProps {
  role: 'customer' | 'provider' | 'admin'
}

const RoleDashboardRouter = ({ role }: RoleDashboardProps) => {
  const { user, isAuthenticated, loading } = useAuth()
  const location = useLocation()

  // Show loading state while checking session
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#fafaf8' }}>
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-teal-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm font-medium" style={{ color: '#57534e' }}>Loading your session...</p>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/signin" state={{ from: location }} replace />
  }

  // Auth check: user role must match the route
  if (user && user.role !== role) {
    // Redirect customers to home, providers/admins to their role route
    return <Navigate to={user.role === 'customer' ? '/' : `/${user.role}`} replace />
  }

  return (
    <>
      {getSubRoute(role, location.pathname)}
    </>
  )
}

const getMainDashboard = (role: 'customer' | 'provider' | 'admin') => {
  if (role === 'customer') return <CustomerDashboard />
  if (role === 'provider') return <ProviderDashboard />
  return <AdminDashboard />
}

const getSubRoute = (role: 'customer' | 'provider' | 'admin', pathname: string) => {
  // Extract sub-route segment
  const parts = pathname.split('/').filter(Boolean)
  // For customer: routes are at root level (e.g., /bookings, /request)
  // For provider/admin: routes are at /role/ level (e.g., /provider/bookings, /admin/users)
  const subRoute = role === 'customer' ? (parts[0] || 'default') : (parts[1] || 'default')

  // Provider routes
  if (role === 'provider') {
    if (subRoute === 'profile') return <ProviderProfilePage />
    if (subRoute === 'requests') return <ProviderRequests />
    if (subRoute === 'bookings') return <ProviderBookings />
    if (subRoute === 'earnings') return <ProviderEarnings />
    if (subRoute === 'notifications') return <ProviderNotifications />
  }

  // Customer routes
  if (role === 'customer') {
    if (subRoute === 'bookings') return <CustomerBookingsPage />;
    // find-providers route removed - customers can only use request flow (provider_id: null)
    if (subRoute === 'request') return <CustomerRequestServicePage />;
    if (subRoute === 'history') return <CustomerHistoryPage />;
    if (subRoute === 'profile') return <CustomerProfilePage />;
    if (subRoute === 'notifications') return <CustomerNotifications />;
    if (subRoute === 'help-support') return <HelpSupportPage />;
    if (subRoute === 'customer' || subRoute === 'default') return <CustomerDashboard />;
  }

  // Admin routes
  if (role === 'admin' && subRoute === 'verification') {
    return <VerificationQueue />
  }

  const routes = role === 'customer' ? customerRoutes : role === 'provider' ? providerRoutes : adminRoutes
  const config = routes[subRoute] || routes.default

  return (
    <PlaceholderPage
      role={role}
      title={config.title}
      subtitle={config.subtitle}
      description={config.description}
      icon={config.icon}
      pageTitle={config.title}
      pageSubtitle={config.subtitle}
    />
  )
}

export default RoleDashboardRouter