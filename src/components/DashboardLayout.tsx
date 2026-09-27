import { ReactNode, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '@/context/AuthContext'
import LanguageSelector from './LanguageSelector'
import NotificationPanel from './NotificationPanel'
import LocationBadge from './LocationBadge'
import {
  BellIcon, UserIcon, HomeIcon, CalendarIcon, CurrencyRupeeIcon,
  ClipboardListIcon, UserGroupIcon,
  ChartBarIcon, WrenchIcon, ShieldCheckIcon, BookOpenIcon, SahaayLogo,
  HelpCircleIcon
} from './Icons'

interface NavItem {
  label: string
  translationKey?: string
  href: string
  icon: React.FC<{ className?: string }>
}

const NAV_CONFIG: Record<string, { items: NavItem[]; accentColor: string; accentBg: string }> = {
  customer: {
    accentColor: '#0E7490',
    accentBg: '#ECFEFF',
    items: [
      { label: 'About', translationKey: 'about', href: '/profile', icon: UserIcon },
      { label: 'Request Service', translationKey: 'request_service', href: '/request', icon: WrenchIcon },
      { label: 'Requests', translationKey: 'requests', href: '/bookings', icon: ClipboardListIcon },
      { label: 'History', translationKey: 'history', href: '/history', icon: CalendarIcon },
      { label: 'Alerts', translationKey: 'alerts', href: '/notifications', icon: BellIcon },
      { label: 'Help & Support', translationKey: 'help_support', href: '/help-support', icon: HelpCircleIcon },
    ],
  },
  provider: {
    accentColor: '#0E7490',
    accentBg: '#ECFEFF',
    items: [
      { label: 'Dashboard', translationKey: 'provider_dashboard', href: '/provider', icon: HomeIcon },
      { label: 'Pending Requests', translationKey: 'pending_requests', href: '/provider/requests', icon: ClipboardListIcon },
      { label: 'My Bookings', translationKey: 'my_bookings', href: '/provider/bookings', icon: CalendarIcon },
      { label: 'Total Earnings', translationKey: 'total_earnings', href: '/provider/earnings', icon: CurrencyRupeeIcon },
      { label: 'Profile', translationKey: 'profile', href: '/provider/profile', icon: UserIcon },
      { label: 'Messages & Alerts', translationKey: 'messages_alerts', href: '/provider/notifications', icon: BellIcon },
    ],
  },
  admin: {
    accentColor: '#155E75',
    accentBg: '#ECFEFF',
    items: [
      { label: 'Overview', translationKey: 'admin_dashboard_title', href: '/admin', icon: ChartBarIcon },
      { label: 'Users', translationKey: 'total_users', href: '/admin/users', icon: UserGroupIcon },
      { label: 'Providers', translationKey: 'service_providers', href: '/admin/providers', icon: WrenchIcon },
      { label: 'Verification', translationKey: 'verification_queue', href: '/admin/verification', icon: ShieldCheckIcon },
      { label: 'Bookings', translationKey: 'my_bookings', href: '/admin/bookings', icon: BookOpenIcon },
      { label: 'Reports', translationKey: 'details', href: '/admin/reports', icon: ChartBarIcon },
    ],
  },
}

interface DashboardLayoutProps {
  children: ReactNode
  role: 'customer' | 'provider' | 'admin'
  pageTitle: string
  pageSubtitle?: string
}

const DashboardLayout = ({ children, role, pageTitle, pageSubtitle }: DashboardLayoutProps) => {
  const { t } = useTranslation()
  const { user, signOut } = useAuth()
  const location = useLocation()
  const config = NAV_CONFIG[role]
  const initials = user?.name ? user.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) : '?'
  const [notificationPanelOpen, setNotificationPanelOpen] = useState(false)

  return (
    <div className="min-h-screen flex" style={{backgroundColor: 'var(--color-bg)'}}>
      {/* Premium Sidebar */}
      <aside
        className="fixed inset-y-0 left-0 z-40 w-64 flex-col bg-white border-r hidden lg:flex"
        style={{
          borderColor: 'var(--color-border)'
        }}
      >
        <div className="flex items-center gap-2 h-16 px-5 border-b" style={{borderColor: 'var(--color-border)'}}>
          <Link to={role === 'admin' ? '/admin' : '/'} className="flex items-center gap-2 group">
            <div className="transition-transform duration-300 group-hover:scale-105">
              <SahaayLogo size={36} bg={config.accentColor} />
            </div>
            <span className="text-lg font-bold" style={{
              color: 'var(--color-text)',
              fontFamily: 'var(--font-display)'
            }}>{t('app_name', 'Sahaay')}</span>
          </Link>
        </div>

        <div className="px-4 py-4 border-b" style={{borderColor: 'var(--color-border)'}}>
          <span
            className="inline-flex items-center px-3 py-1.5 rounded-full text-[11px] font-semibold uppercase tracking-wider"
            style={{
              backgroundColor: config.accentBg,
              color: config.accentColor,
              fontFamily: 'var(--font-display)'
            }}
          >
            {role === 'provider' ? t('provider', 'Service Provider') : role === 'admin' ? t('admin', 'Admin') : t('customer', 'Customer')}
          </span>
        </div>

        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
          {config.items.map(item => {
            const isActive = location.pathname === item.href
            const itemLabel = item.translationKey ? t(item.translationKey, item.label) : item.label
            return (
              <Link
                key={item.href}
                to={item.href}
                className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 group"
                style={{
                  backgroundColor: isActive ? config.accentBg : 'transparent',
                  color: isActive ? config.accentColor : 'var(--color-text-muted)',
                  fontFamily: 'var(--font-body)'
                }}
              >
                <item.icon className={`w-5 h-5 flex-shrink-0 transition-colors ${isActive ? '' : 'group-hover:text-[var(--color-primary)]'}`} />
                {itemLabel}
                {isActive && (
                  <div className="ml-auto w-1.5 h-1.5 rounded-full" style={{backgroundColor: config.accentColor}} />
                )}
              </Link>
            )
          })}
        </nav>

        <div className="p-4 border-t" style={{borderColor: 'var(--color-border)'}}>
          <div className="flex items-center gap-3 px-3 py-3 mb-2 rounded-xl" style={{backgroundColor: 'var(--color-bg)'}}>
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center text-white text-sm font-bold flex-shrink-0"
              style={{
                backgroundColor: config.accentColor,
                boxShadow: 'var(--shadow-sm)'
              }}
            >
              {initials}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold truncate" style={{color: 'var(--color-text)', fontFamily: 'var(--font-display)'}}>{user?.name || 'Guest'}</p>
              <p className="text-[11px] truncate" style={{color: 'var(--color-text-muted)'}}>{user?.email || ''}</p>
            </div>
          </div>
          <button
            onClick={signOut}
            className="w-full text-left px-4 py-2.5 text-sm rounded-xl transition-all duration-200 hover:bg-[var(--color-bg)] flex items-center gap-2"
            style={{color: 'var(--color-text-muted)', fontFamily: 'var(--font-body)'}}
          >
            <span className="w-4 h-4">↪</span>
            {t('logout', 'Sign out')}
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 lg:ml-64 flex flex-col min-h-screen">
        <header className="sticky top-0 z-30 bg-white border-b px-6 h-16 flex items-center justify-between" style={{
          borderColor: 'var(--color-border)',
          boxShadow: '0 1px 2px rgba(15,23,42,.04)'
        }}>
          <div>
            <h1 className="text-base font-bold" style={{color: 'var(--color-text)', fontFamily: 'var(--font-display)'}}>{pageTitle}</h1>
            {pageSubtitle && <p className="text-xs mt-0.5" style={{color: 'var(--color-text-muted)'}}>{pageSubtitle}</p>}
          </div>
          <div className="flex items-center gap-3">
            <LanguageSelector />
            {role !== 'admin' && <LocationBadge />}
            <button
              onClick={() => setNotificationPanelOpen(!notificationPanelOpen)}
              className="relative p-2.5 rounded-xl transition-all duration-200 hover:bg-[var(--color-bg)]"
              style={{color: 'var(--color-text-muted)'}}
            >
              <BellIcon className="w-5 h-5" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full" style={{backgroundColor: 'var(--color-accent)', boxShadow: 'var(--shadow-sm)'}} />
            </button>
            {notificationPanelOpen && user && (
              <NotificationPanel
                isOpen={notificationPanelOpen}
                onClose={() => setNotificationPanelOpen(false)}
                userRole={role === 'admin' ? 'provider' : role}
                userId={user.id}
              />
            )}
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center text-white text-xs font-bold lg:hidden"
              style={{
                backgroundColor: config.accentColor,
                boxShadow: 'var(--shadow-sm)'
              }}
            >
              {initials}
            </div>
          </div>
        </header>

        <main className="flex-1 p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  )
}

export default DashboardLayout