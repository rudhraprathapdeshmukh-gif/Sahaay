import { useState, useEffect } from 'react'
import { useAuth } from '@/context/AuthContext'
import { useTranslation } from 'react-i18next'
import DashboardLayout from '@/components/DashboardLayout'
import { supabase } from '@/lib/supabase'
import { UserIcon } from '@/components/Icons'

interface CustomerProfile {
  id: string
  full_name: string
  first_name?: string
  last_name?: string
  email: string
  phone?: string
  city?: string
  state?: string
  avatar_url?: string
}

const CustomerProfilePage = () => {
  const { user } = useAuth()
  const { t } = useTranslation()
  const [loading, setLoading] = useState(true)
  const [profile, setProfile] = useState<CustomerProfile>({
    id: '',
    full_name: '',
    email: '',
    phone: '',
    avatar_url: '',
  })
  const [saving, setSaving] = useState(false)

  const loadData = async () => {
    if (!user?.id) return

    try {
      setLoading(true)

      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', user.id)
        .single()

      if (error) throw error

      if (data) {
        setProfile({
          id: data.id,
          full_name: data.full_name || '',
          first_name: data.first_name || '',
          last_name: data.last_name || '',
          email: data.email || '',
          phone: data.phone || '',
          avatar_url: data.avatar_url,
        })
      }
    } catch (err) {
      console.error('Failed to load profile:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [user?.id])

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user?.id) return

    try {
      setSaving(true)

      const { error } = await supabase
        .from('users')
        .update({
          full_name: profile.full_name,
          first_name: profile.first_name,
          last_name: profile.last_name,
          phone: profile.phone,
        })
        .eq('id', user.id)

      if (error) throw error

      alert(t('profile_saved', 'Profile updated successfully!'))
    } catch (err) {
      console.error('Failed to save profile:', err)
      alert('Failed to save profile. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const initials = profile.full_name
    ? profile.full_name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : 'U'

  return (
    <DashboardLayout
      role="customer"
      pageTitle={t('profile', 'My Profile')}
      pageSubtitle={t('manage_personal_info', 'Manage your personal information and contact details')}
    >
      <div className="max-w-3xl mx-auto space-y-6">
        {loading ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center shadow-sm">
            <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-sm font-medium text-slate-600">{t('loading', 'Loading profile...')}</p>
          </div>
        ) : (
          <form onSubmit={handleSave} className="space-y-6">
            {/* Profile Card Header */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
              <div className="flex items-center gap-6">
                <div className="w-20 h-20 rounded-2xl bg-teal-600 text-white font-bold flex items-center justify-center text-2xl shadow-sm">
                  {profile.avatar_url ? (
                    <img src={profile.avatar_url} alt="" className="w-full h-full object-cover rounded-2xl" />
                  ) : (
                    initials
                  )}
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-slate-900">{profile.full_name || 'Customer'}</h2>
                  <p className="text-sm text-slate-500">{profile.email}</p>
                  <span className="inline-block mt-2 px-3 py-1 bg-teal-50 text-teal-700 text-xs font-semibold rounded-full border border-teal-200">
                    Customer Account
                  </span>
                </div>
              </div>
            </div>

            {/* Personal Details */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
              <h3 className="text-base font-bold text-slate-900 pb-2 border-b border-slate-100 flex items-center gap-2">
                <UserIcon className="w-5 h-5 text-teal-600" />
                {t('basic_information', 'Personal Information')}
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                    {t('full_name', 'Full Name')} *
                  </label>
                  <input
                    type="text"
                    required
                    value={profile.full_name}
                    onChange={(e) => setProfile({ ...profile, full_name: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                    {t('email', 'Email')} *
                  </label>
                  <input
                    type="email"
                    disabled
                    value={profile.email}
                    className="w-full bg-slate-100 border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-500 cursor-not-allowed"
                  />
                  <p className="text-[11px] text-slate-400 mt-1">Email cannot be changed</p>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                    {t('phone', 'Phone Number')}
                  </label>
                  <input
                    type="tel"
                    disabled
                    value={profile.phone}
                    placeholder="+91 9876543210"
                    className="w-full bg-slate-100 border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-500 cursor-not-allowed"
                  />
                  <p className="text-[11px] text-slate-400 mt-1">Phone number cannot be changed</p>
                </div>
              </div>
            </div>

            {/* Save Button */}
            <div className="flex justify-end gap-3">
              <button
                type="submit"
                disabled={saving}
                className="px-8 py-3 bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white font-bold rounded-xl shadow-sm transition-colors"
              >
                {saving ? t('saving', 'Saving...') : t('save_profile', 'Save Profile')}
              </button>
            </div>
          </form>
        )}
      </div>
    </DashboardLayout>
  )
}

export default CustomerProfilePage