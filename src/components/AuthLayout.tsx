import { Link } from 'react-router-dom'
import { SahaayLogo } from './Icons'

const AuthLayout = ({ children, title, subtitle }: { children: React.ReactNode; title: string; subtitle?: string }) => {
  return (
    <div className="min-h-screen flex flex-col" style={{backgroundColor: '#f8fafc'}}>
      <header className="bg-white border-b" style={{borderColor: '#e2e8f0'}}>
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between h-16">
            <Link to="/" className="flex items-center gap-2">
              <SahaayLogo size={36} bg="var(--color-primary)" />
              <span className="text-lg font-bold" style={{color: '#0f172a'}}>Sahaay</span>
            </Link>
            <Link to="/admin-login" className="text-xs font-medium" style={{color: '#94a3b8'}}>
              Admin
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <h1 className="text-2xl sm:text-3xl font-bold" style={{color: '#0f172a'}}>{title}</h1>
            {subtitle && <p className="mt-2 text-sm" style={{color: '#475569'}}>{subtitle}</p>}
          </div>
          <div className="bg-white rounded-2xl border p-6 sm:p-8" style={{borderColor: '#e2e8f0', boxShadow: '0 4px 16px rgba(15, 23, 42, 0.08)'}}>
            {children}
          </div>
        </div>
      </main>
    </div>
  )
}

export default AuthLayout