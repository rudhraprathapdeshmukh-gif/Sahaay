import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '@/context/AuthContext'
import { supabase } from '@/lib/supabase'
import { SahaayLogo } from '@/components/Icons'

const AdminLogin = () => {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const { signIn } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    // Basic validation
    if (!email.includes('@') || password.length < 6) {
      setError(t('admin_login_invalid_short', 'Invalid credentials. Password must be at least 6 characters.'))
      return
    }

    setLoading(true)
    const authedUser = await signIn(email, password)
    setLoading(false)
    if (authedUser) {
      // Verify user has admin role
      if (authedUser.role !== 'admin') {
        setError(t('admin_login_access_denied', 'Access denied. Admin privileges required.'))
        // Sign out the non-admin user
        await supabase.auth.signOut()
      } else {
        navigate('/admin')
      }
    } else {
      setError(t('admin_login_invalid', 'Invalid credentials.'))
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between h-16">
            <Link to="/" className="flex items-center gap-2">
              <SahaayLogo size={32} bg="#b45309" />
              <span className="text-xl font-semibold text-slate-900">Sahaay</span>
            </Link>
            <Link to="/signin" className="text-xs text-slate-400 hover:text-slate-600">
              ← {t('back', 'Back')}
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-sm">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-12 h-12 bg-slate-800 rounded-lg mb-4">
              <span className="text-white text-xl">🔒</span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">{t('admin_login', 'Admin Login')}</h1>
            <p className="mt-2 text-sm text-slate-500">{t('admin_login_restricted', 'Restricted access')}</p>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="admin-email" className="block text-sm font-medium text-slate-700 mb-1">{t('admin_email', 'Admin email')}</label>
                <input
                  id="admin-email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-500 focus:border-transparent text-sm"
                  placeholder="admin@sahaay.com"
                />
              </div>

              <div>
                <label htmlFor="admin-password" className="block text-sm font-medium text-slate-700 mb-1">{t('password', 'Password')}</label>
                <input
                  id="admin-password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-500 focus:border-transparent text-sm"
                  placeholder={t('admin_password_placeholder', 'At least 6 characters')}
                />
              </div>

              {error && <p className="text-sm text-red-600">{error}</p>}

              <button
                type="submit"
                disabled={loading}
                className="w-full px-4 py-2.5 bg-slate-800 hover:bg-slate-900 text-white font-medium rounded-lg transition-colors text-sm disabled:opacity-50"
              >
                {loading ? t('admin_authenticating', 'Authenticating...') : t('sign_in_as_admin', 'Sign in as Admin')}
              </button>
            </form>
          </div>

          <p className="mt-4 text-xs text-center text-slate-400">
            {t('admin_login_hint', 'Use your admin account credentials to sign in.')}
          </p>
        </div>
      </main>
    </div>
  )
}

export default AdminLogin