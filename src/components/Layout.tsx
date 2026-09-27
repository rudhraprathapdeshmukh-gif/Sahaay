import { Navigate } from 'react-router-dom'
import Navbar from './Navbar'
import { useAuth } from '@/context/AuthContext'
import { SahaayLogo } from './Icons'

const Layout = ({ children }: { children: React.ReactNode }) => {
  const { user, isAuthenticated } = useAuth()

  // Prevent admin from viewing customer-facing public / service pages
  if (isAuthenticated && user?.role === 'admin') {
    return <Navigate to="/admin" replace />
  }

  return (
    <div className="min-h-screen flex flex-col" style={{backgroundColor: 'var(--color-bg)'}}>
      <Navbar />
      <main className="flex-1">{children}</main>
      {/* Footer */}
      <footer className="mt-20 border-t-2 relative overflow-hidden" style={{borderColor: 'var(--color-primary)', backgroundColor: 'var(--color-text)', color: 'var(--color-text-muted)'}}>
        {/* Subtle gradient overlay */}
        <div className="absolute inset-0 opacity-5" style={{
          background: 'linear-gradient(135deg, var(--color-primary) 0%, var(--color-accent) 100%)'
        }}></div>
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-14 relative z-10">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-10 mb-12">
            {/* Brand */}
            <div className="col-span-2 sm:col-span-1">
              <div className="flex items-center gap-2.5 mb-4">
                <SahaayLogo size={36} bg="var(--color-primary)" />
                <span className="text-xl font-bold text-white" style={{fontFamily: 'var(--font-display)'}}>Sahaay</span>
              </div>
              <p className="text-sm leading-relaxed" style={{color: 'rgba(255,255,255,0.6)'}}>
                Connecting India with trusted local service providers — quality work, right in your neighbourhood.
              </p>
            </div>

            {/* Services */}
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider mb-4" style={{color: 'var(--color-text-muted)', fontFamily: 'var(--font-display)'}}>Services</h4>
              <ul className="space-y-3">
                {['Electrician', 'Plumber', 'Carpenter', 'Painter', 'Cleaner'].map((link) => (
                  <li key={link}>
                    <a href="#services" className="text-sm transition-all duration-200 hover:text-white hover:pl-1" style={{color: 'rgba(255,255,255,0.6)'}}>{link}</a>
                  </li>
                ))}
              </ul>
            </div>

            {/* Company */}
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider mb-4" style={{color: 'var(--color-text-muted)', fontFamily: 'var(--font-display)'}}>Company</h4>
              <ul className="space-y-3">
                {['About Us', 'How it Works', 'Become a Provider', 'Careers'].map((link) => (
                  <li key={link}>
                    <a href="#" className="text-sm transition-all duration-200 hover:text-white hover:pl-1" style={{color: 'rgba(255,255,255,0.6)'}}>{link}</a>
                  </li>
                ))}
              </ul>
            </div>

            {/* Support */}
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider mb-4" style={{color: 'var(--color-text-muted)', fontFamily: 'var(--font-display)'}}>Support</h4>
              <ul className="space-y-3">
                {[
                  { name: 'Help Center', path: '/help-support' },
                  { name: 'Contact Us', path: '/help-support' },
                  { name: 'Privacy Policy', path: '/privacy' },
                  { name: 'Terms of Service', path: '#Terms' }
                ].map((link) => (
                  <li key={link.name}>
                    <a href={link.path} className="text-sm transition-all duration-200 hover:text-white hover:pl-1" style={{color: 'rgba(255,255,255,0.6)'}}>{link.name}</a>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="pt-8 border-t flex flex-col sm:flex-row items-center justify-between gap-4" style={{borderColor: 'rgba(255,255,255,0.1)'}}>
            <p className="text-sm" style={{color: 'rgba(255,255,255,0.5)'}}>© {new Date().getFullYear()} Sahaay. Made in India.</p>
            <div className="flex items-center gap-6">
              <span className="text-sm" style={{color: 'rgba(255,255,255,0.5)'}}>Available in 200+ cities</span>
              <div className="flex items-center gap-3">
                <span className="w-2 h-2 rounded-full animate-pulse" style={{backgroundColor: '#10B981'}} />
                <span className="text-sm" style={{color: 'rgba(255,255,255,0.5)'}}>All systems operational</span>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}

export default Layout