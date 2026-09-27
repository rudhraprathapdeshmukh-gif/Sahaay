import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '@/context/AuthContext'
import { MenuIcon, CloseIcon, SahaayLogo, UserIcon } from './Icons'
import LanguageSelector from './LanguageSelector'
import LocationBadge from './LocationBadge'
import ThemeToggle from './ThemeToggle'

const Navbar = () => {
  const { t } = useTranslation()
  const { user, signOut, isAuthenticated } = useAuth()
  const [mobileOpen, setMobileOpen] = useState(false)

  const navLinks = [
    { href: '/how-it-works', label: t('how_it_works', 'How it works') },
    { href: '/services', label: t('services', 'Services') },
    { href: '/trust', label: t('trust', 'Trust') },
  ]

  return (
    <header className="sticky top-0 z-50 border-b transition-colors duration-300" style={{backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)', boxShadow: '0 1px 2px rgba(15,23,42,.04)'}}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to={isAuthenticated && user?.role === 'admin' ? '/admin' : '/'} className="flex items-center gap-3 group">
            <div className="transition-transform duration-300 group-hover:scale-105">
              <SahaayLogo size={40} bg="var(--color-primary)" />
            </div>
            <div className="flex flex-col leading-none">
              <span className="text-lg font-bold tracking-tight" style={{fontFamily: 'var(--font-display)', color: 'var(--color-text)'}}>{t('app_name', 'Sahaay')}</span>
              <span className="text-[10px] font-semibold uppercase tracking-widest mt-0.5" style={{color: 'var(--color-text-subtle)'}}>Local Services</span>
            </div>
          </Link>

          {/* Center nav - hidden for admins */}
          {(!isAuthenticated || user?.role !== 'admin') && (
            <nav className="hidden md:flex items-center gap-1">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  to={link.href}
                  className="px-4 py-2 text-sm font-medium rounded-xl transition-all duration-200 hover:text-[var(--color-primary)] hover:bg-[var(--color-primary-light)]"
                  style={{color: 'var(--color-text-muted)'}}
                >
                  {link.label}
                </Link>
              ))}
            </nav>
          )}

          {/* Right side */}
          <div className="hidden md:flex items-center gap-4">
            <ThemeToggle />
            <LanguageSelector />
            {isAuthenticated && user ? (
              <div className="flex items-center gap-3">
                <LocationBadge />
                <Link
                  to={user.role === 'customer' ? '/profile' : `/${user.role}/profile`}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl transition-all duration-200 hover:bg-[var(--color-bg)]"
                  style={{color: 'var(--color-text-muted)'}}
                  title={t('profile', 'Profile')}
                >
                  <UserIcon className="w-5 h-5" />
                  <span className="text-sm font-semibold hidden lg:inline">{t('profile', 'Profile')}</span>
                </Link>
              </div>
            ) : (
              <>
                <Link to="/signin" className="text-sm font-medium transition-colors hover:text-[var(--color-text)]" style={{color: 'var(--color-text-muted)'}}>
                  {t('sign_in', 'Sign in')}
                </Link>
                <Link to="/signup" className="btn-primary px-5 py-2.5 text-sm">
                  {t('sign_up', 'Get Started')}
                </Link>
              </>
            )}
          </div>

          <div className="flex items-center gap-2 md:hidden">
            <ThemeToggle />
            <LanguageSelector />
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className="p-2.5 rounded-xl transition-colors hover:bg-[var(--color-bg)]"
              style={{color: 'var(--color-text-muted)'}}
              aria-label="Toggle menu"
            >
              {mobileOpen ? <CloseIcon className="w-5 h-5" /> : <MenuIcon className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {mobileOpen && (
          <div className="md:hidden border-t py-4 space-y-1 transition-colors duration-300" style={{backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)'}}>
            {isAuthenticated && user?.role === 'admin' ? (
              <>
                <Link
                  to="/admin"
                  onClick={() => setMobileOpen(false)}
                  className="block px-4 py-3 text-sm font-semibold rounded-xl transition-colors"
                  style={{backgroundColor: 'var(--color-primary-light)', color: 'var(--color-primary)'}}
                >
                  {t('admin_dashboard', 'Admin Dashboard')}
                </Link>
                <div className="pt-3 border-t space-y-1" style={{borderColor: 'var(--color-border)'}}>
                  <div className="flex items-center gap-2 px-2">
                    <LocationBadge />
                  </div>
                  <div className="px-4 py-2 text-sm" style={{color: 'var(--color-text-muted)'}}>
                    {t('admin', 'Admin')}: <span className="font-semibold" style={{color: 'var(--color-text)'}}>{user.name}</span>
                  </div>
                  <button onClick={signOut} className="block w-full text-left px-4 py-2.5 text-sm font-medium rounded-xl transition-colors hover:bg-[var(--color-bg)]" style={{color: 'var(--color-text-muted)'}}>
                    {t('logout', 'Sign out')}
                  </button>
                </div>
              </>
            ) : (
              <>
                {navLinks.map((link) => (
                  <Link
                    key={link.href}
                    to={link.href}
                    onClick={() => setMobileOpen(false)}
                    className="block px-4 py-2.5 text-sm font-medium rounded-xl transition-colors hover:text-[var(--color-primary)] hover:bg-[var(--color-primary-light)]"
                    style={{color: 'var(--color-text-muted)'}}
                  >
                    {link.label}
                  </Link>
                ))}
                <div className="pt-3 border-t space-y-1" style={{borderColor: 'var(--color-border)'}}>
                  {isAuthenticated && user ? (
                    <>
                      <div className="px-2 pb-1">
                        <LocationBadge />
                      </div>
                      <Link
                        to={user.role === 'customer' ? '/' : `/${user.role}`}
                        onClick={() => setMobileOpen(false)}
                        className="block px-4 py-3 text-sm font-semibold rounded-xl text-center transition-colors"
                        style={{backgroundColor: 'var(--color-primary-light)', color: 'var(--color-primary)'}}
                      >
                        {user.role === 'provider' ? t('provider_dashboard', 'Provider Dashboard') : t('about', 'About')}
                      </Link>
                      <button onClick={signOut} className="block w-full text-left px-4 py-2.5 text-sm font-medium rounded-xl transition-colors hover:bg-[var(--color-bg)]" style={{color: 'var(--color-text-muted)'}}>
                        {t('logout', 'Sign out')}
                      </button>
                    </>
                  ) : (
                    <>
                      <Link to="/signin" onClick={() => setMobileOpen(false)} className="block px-4 py-2.5 text-sm font-medium rounded-xl transition-colors hover:bg-[var(--color-bg)]" style={{color: 'var(--color-text)'}}>
                        {t('sign_in', 'Sign in')}
                      </Link>
                      <Link to="/signup" onClick={() => setMobileOpen(false)} className="block px-4 py-3 text-sm font-semibold rounded-xl text-center btn-primary">
                        {t('sign_up', 'Get Started')}
                      </Link>
                    </>
                  )}
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </header>
  )
}

export default Navbar