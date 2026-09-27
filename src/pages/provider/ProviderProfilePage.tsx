import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import DashboardLayout from '@/components/DashboardLayout'
import {
  CheckCircleIcon, StarIcon, LocationIcon,
  WrenchIcon, ShieldCheckIcon
} from '@/components/Icons'
import { useAuth } from '@/context/AuthContext'
import {
  fetchFullProviderProfile,
  fetchServices,
} from '@/lib/providers'
import type { Service, ProviderProfileFull } from '@/types/database'

const ProviderProfilePage = () => {
  const { t } = useTranslation()
  const { user } = useAuth()

  const [loading, setLoading] = useState(true)
  const [profile, setProfile] = useState<ProviderProfileFull | null>(null)
  const [services, setServices] = useState<Service[]>([])
  const [errorMessage, setErrorMessage] = useState('')

  // Load profile & services on mount
  useEffect(() => {
    const load = async () => {
      if (!user?.id) return
      setLoading(true)
      try {
        const [prof, svcs] = await Promise.all([
          fetchFullProviderProfile(user.id),
          fetchServices(),
        ])
        setServices(svcs)
        if (prof) setProfile(prof)
      } catch (err) {
        console.error('Failed to load profile:', err)
        setErrorMessage('Could not load profile data from Supabase.')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [user])

  if (loading) {
    return (
      <DashboardLayout role="provider" pageTitle={t('provider_profile_title', 'Provider Profile')} pageSubtitle={t('view_provider_info', 'View your provider information')}>
        <div className="py-20 text-center">
          <div className="w-10 h-10 border-4 border-teal-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm font-medium" style={{ color: '#475569' }}>{t('loading_provider_profile', 'Loading provider profile...')}</p>
        </div>
      </DashboardLayout>
    )
  }

  // If no profile exists yet in Supabase
  if (!profile) {
    return (
      <DashboardLayout role="provider" pageTitle={t('provider_profile_title', 'Provider Profile')} pageSubtitle={t('complete_provider_profile', 'Complete Your Provider Profile')}>
        <div className="max-w-xl mx-auto py-12 text-center bg-white rounded-2xl border p-8" style={{ borderColor: '#e2e8f0' }}>
          <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4" style={{ backgroundColor: 'var(--color-primary-tint)' }}>
            <WrenchIcon className="w-8 h-8" style={{ color: 'var(--color-primary)' }} />
          </div>
          <h2 className="text-xl font-bold mb-2" style={{ color: '#0f172a', fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
            {t('complete_provider_profile', 'Complete Your Provider Profile')}
          </h2>
          <p className="text-sm leading-relaxed mb-6" style={{ color: '#475569' }}>
            {t('complete_profile_desc', "You haven't completed your provider registration yet. Set your service category and skills to start receiving nearby requests.")}
          </p>
          <Link
            to="/provider-onboarding"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold text-white transition-all shadow-sm"
            style={{ backgroundColor: 'var(--color-primary)' }}
          >
            {t('start_provider_setup', 'Start Provider Setup')} →
          </Link>
        </div>
      </DashboardLayout>
    )
  }

  const fullName = profile.user.full_name || t('provider', 'Service Provider')
  const initials = fullName.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)
  const avatarUrl = profile.provider.profile_photo_url || profile.user.avatar_url || ''
  const currentCategoryName = services.find(s => s.id === profile.provider.service_id)?.name || t('uncategorized_service', 'Uncategorized Service')
  const verificationStatus = profile.provider.verification_status || 'pending'
  const city = profile.user.city || ''
  const state = profile.user.state || ''
  const yearsExperience = profile.provider.years_experience || '0-1'

  return (
    <DashboardLayout role="provider" pageTitle={t('provider_profile_title', 'Provider Profile')} pageSubtitle={t('view_provider_info', 'View your provider information')}>
      <div className="max-w-5xl mx-auto space-y-6">

        {errorMessage && (
          <div className="p-4 rounded-xl text-sm border flex items-center justify-between" style={{ backgroundColor: '#fef2f2', borderColor: '#fecaca', color: '#dc2626' }}>
            <div className="flex items-center gap-2.5">
              <span className="text-base">⚠️</span>
              <span>{errorMessage}</span>
            </div>
            <button onClick={() => setErrorMessage('')} className="text-xs font-semibold px-2 py-1 rounded hover:bg-red-100 transition-colors">
              ✕ {t('dismiss', 'Dismiss')}
            </button>
          </div>
        )}

        <div className="bg-blue-50 border border-blue-200 p-4 rounded-xl flex items-start gap-3">
          <div className="mt-0.5 text-blue-600">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <h4 className="text-sm font-bold text-blue-900">{t('profile_readonly', 'Profile Is Read-Only')}</h4>
            <p className="text-xs text-blue-800 mt-1">{t('profile_readonly_desc', 'Profile details cannot be changed after registration. Contact Admin by email for any changes.')}</p>
          </div>
        </div>

        {/* Top Hero Card */}
        <div className="bg-white rounded-2xl border overflow-hidden" style={{ borderColor: '#e2e8f0', boxShadow: '0 2px 12px rgba(28,25,23,0.04)' }}>
          <div className="px-6 py-6" style={{ background: 'var(--color-primary)' }}>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                {/* Profile Photo */}
                <div className="relative group">
                  <div className="w-20 h-20 rounded-2xl overflow-hidden border-2 border-white/30 flex items-center justify-center text-2xl font-bold text-white shadow-md" style={{ backgroundColor: 'rgba(255,255,255,0.2)' }}>
                    {avatarUrl ? (
                      <img src={avatarUrl} alt={fullName} className="w-full h-full object-cover" />
                    ) : (
                      initials
                    )}
                  </div>
                </div>

                <div className="text-white">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <h2 className="text-xl font-bold">{fullName}</h2>
                    {/* Verification Status Badge */}
                    <span
                      className="text-[11px] font-semibold uppercase tracking-wider px-2.5 py-0.5 rounded-full border inline-flex items-center gap-1"
                      style={{
                        backgroundColor: verificationStatus === 'verified' ? 'rgba(204,251,241,0.2)' : 'rgba(254,243,199,0.2)',
                        borderColor: verificationStatus === 'verified' ? '#5eead4' : '#fcd34d',
                        color: verificationStatus === 'verified' ? 'var(--color-primary-light)' : 'var(--color-accent-tint)',
                      }}
                    >
                      <ShieldCheckIcon className="w-3.5 h-3.5" />
                      {verificationStatus === 'verified' ? t('verified_pro', 'Verified Pro') : t('verification_under_review', 'Verification Under Review')}
                    </span>
                  </div>
                  <p className="text-xs text-white/80 flex items-center gap-1.5">
                    <span>{currentCategoryName}</span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <LocationIcon className="w-3 h-3" />
                      {city && state ? `${city}, ${state}` : t('location_pending', 'Location pending')}
                    </span>
                  </p>
                  <div className="flex items-center gap-3 mt-2 text-xs text-white/90">
                    {profile.provider.rating && profile.provider.rating > 0 ? (
                      <>
                        <span className="flex items-center gap-1">
                          <StarIcon className="w-3.5 h-3.5 text-amber-300" />
                          <strong>{profile.provider.rating.toFixed(1)}</strong>
                          <span className="text-white/70">({profile.provider.jobs_completed} {t('completed_jobs', 'jobs')})</span>
                        </span>
                        <span>•</span>
                      </>
                    ) : null}

                    <span>{yearsExperience} {t('yrs_experience', 'yrs experience')}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Read-only profile details */}
        <div className="bg-white rounded-2xl border p-6 sm:p-7" style={{ borderColor: '#e2e8f0', boxShadow: '0 2px 12px rgba(28,25,23,0.03)' }}>
          <div className="flex items-center justify-between pb-4 mb-5 border-b border-slate-100">
            <div>
              <h3 className="text-base font-bold text-slate-900">{t('personal_contact_info', 'Personal & Contact Information')}</h3>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mb-8">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">{t('name', 'Full Name')}</p>
              <p className="text-sm font-medium text-slate-800">{fullName}</p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">{t('phone', 'Phone Number')}</p>
              <p className="text-sm font-medium text-slate-800">{profile.user.phone || '-'}</p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">{t('city', 'City')}</p>
              <p className="text-sm font-medium text-slate-800">{city || '-'}</p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">{t('state', 'State')}</p>
              <p className="text-sm font-medium text-slate-800">{state || '-'}</p>
            </div>
          </div>

          <div className="flex items-center justify-between pb-4 mb-5 border-b border-slate-100">
            <div>
              <h3 className="text-base font-bold text-slate-900">{t('service_category_skills', 'Service Category & Skills')}</h3>
            </div>
          </div>

          <div className="mb-8">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">{t('primary_service_category', 'Primary Service Category')}</p>
            <p className="text-sm font-medium text-slate-800 mb-5">{currentCategoryName}</p>

            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">{t('skills_specific_jobs', 'Skills & Specific Jobs')}</p>
            <div className="flex flex-wrap gap-2">
              {profile.skills && profile.skills.length > 0 ? (
                profile.skills.map((sk: any, idx: number) => (
                  <span key={sk.id ?? idx} className="px-3 py-1.5 rounded-lg text-xs font-medium border bg-blue-50 border-blue-200 text-blue-800">
                    {sk.name}
                  </span>
                ))
              ) : (
                <span className="text-sm text-slate-500">{t('no_skills_listed', 'No specific skills listed.')}</span>
              )}
            </div>
          </div>

          <div className="flex items-center justify-between pb-4 mb-5 border-b border-slate-100">
            <div>
              <h3 className="text-base font-bold text-slate-900">{t('professional_bio', 'Professional Bio')}</h3>
            </div>
          </div>

          <div className="mb-2">
            <p className="text-sm leading-relaxed text-slate-700 bg-slate-50 p-4 rounded-lg border border-slate-100">
              {profile.provider.bio || t('no_bio_provided', 'No bio provided.')}
            </p>
          </div>
        </div>

        {/* Action Bar */}
        <div className="flex items-center justify-start pt-2">
          <Link
            to="/provider"
            className="text-xs font-semibold px-4 py-2.5 rounded-lg border border-slate-300 text-slate-600 hover:bg-slate-50 transition-colors"
          >
            ← {t('back_to_dashboard', 'Back to Dashboard')}
          </Link>
        </div>

      </div>
    </DashboardLayout>
  )
}

export default ProviderProfilePage
