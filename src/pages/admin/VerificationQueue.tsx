import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import DashboardLayout from '@/components/DashboardLayout'
import { supabase } from '@/lib/supabase'
import {
  ShieldCheckIcon, CheckCircleIcon, CloseIcon, LocationIcon,
  WrenchIcon, ClockIcon, AlertCircleIcon
} from '@/components/Icons'

interface ProviderApplication {
  id: string
  user_id: string
  service_id: number
  bio: string | null
  years_experience: string | null
  verification_status: 'unverified' | 'pending' | 'verified' | 'rejected'
  profile_photo_url: string | null
  certificate_url: string | null
  applied_at: string
  updated_at: string
  service_name: string
  full_name: string
  email: string
  phone: string | null
  city: string | null
  state: string | null
  avatar_url: string | null
  latitude: number | null
  longitude: number | null
  skills?: { id: number; name: string }[]
}

export default function VerificationQueue() {
  const { t } = useTranslation()
  const [applications, setApplications] = useState<ProviderApplication[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'pending' | 'verified' | 'rejected' | 'all'>('pending')
  const [updatingId, setUpdatingId] = useState<string | null>(null)
  const [selectedCertUrl, setSelectedCertUrl] = useState<string | null>(null)
  const [certLoading, setCertLoading] = useState(false)
  const [selectedPhotoUrl, setSelectedPhotoUrl] = useState<string | null>(null)

  // Resolve a stored certificate URL to a viewable URL.
  // Stored values are public-format URLs, but the provider-certificates bucket is
  // private, so we mint a signed URL for the admin session when displaying.
  // Base64 data-URI fallbacks are returned as-is.
  const resolveCertificateUrl = async (storedUrl: string): Promise<string> => {
    if (storedUrl.startsWith('data:')) return storedUrl
    const marker = '/provider-certificates/'
    const idx = storedUrl.lastIndexOf(marker)
    if (idx === -1) return storedUrl
    const path = storedUrl.slice(idx + marker.length)
    try {
      const { data, error } = await supabase.storage
        .from('provider-certificates')
        .createSignedUrl(path, 60 * 15)
      if (!error && data?.signedUrl) return data.signedUrl
    } catch (e) {
      console.error('Failed to create signed URL for certificate:', e)
    }
    return storedUrl // last resort — works if the bucket is ever made public
  }

  const handleViewCertificate = async (storedUrl: string) => {
    setCertLoading(true)
    const url = await resolveCertificateUrl(storedUrl)
    setSelectedCertUrl(url)
    setCertLoading(false)
  }

  // True for both `*.pdf` URLs and base64 `data:application/pdf;…` data URIs
  const isPdfUrl = (u: string) =>
    /\.pdf($|\?)/i.test(u) || u.startsWith('data:application/pdf')

  const fetchApplications = async () => {
    setLoading(true)
    setError(null)
    try {
      const { data: rpcData, error: rpcErr } = await supabase
        .rpc('get_admin_provider_applications')

      if (!rpcErr) {
        setApplications(rpcData || [])
        return
      }

      if ((rpcErr as any)?.code === '42703' || /latitude|longitude|column .* does not exist/i.test(rpcErr.message || '')) {
        console.warn(
          'RPC get_admin_provider_applications failed due to missing column (likely users.latitude/longitude) — using direct fallback. Run migration 0005_add_location_columns.sql then 0010_admin_verification_immutable.sql to fix the RPC.',
          rpcErr
        )
      } else {
        console.warn('RPC not available, falling back to direct query:', rpcErr.message)
      }

      const { data, error } = await supabase
        .from('service_providers')
        .select(`
          id, user_id, service_id, bio, years_experience,
          verification_status, profile_photo_url, certificate_url,
          created_at, updated_at
        `)
        .order('created_at', { ascending: false })

      if (error) throw error
      if (!data || data.length === 0) { setApplications([]); return }

      const userIds = [...new Set(data.map(r => r.user_id))]
      const serviceIds = [...new Set(data.map(r => r.service_id).filter(Boolean))]
      const providerIds = data.map((r: any) => r.id)

      const baseUsersPromise = supabase.from('users')
        .select('id, full_name, email, phone, city, state, avatar_url')
        .in('id', userIds)

      const [usersRes, servicesRes, skillsRes] = await Promise.all([
        baseUsersPromise,
        serviceIds.length ? supabase.from('services').select('id, name').in('id', serviceIds) : { data: [], error: null } as any,
        providerIds.length
          ? supabase.from('provider_skills').select('provider_id, skill_id, skills(id, name)').in('provider_id', providerIds)
          : { data: [], error: null } as any,
      ])

      if (usersRes.error) {
        console.warn('Users enrichment failed (non-fatal):', usersRes.error)
      }
      if (skillsRes.error) {
        console.warn('Skills enrichment failed (non-fatal):', skillsRes.error)
      }
      if (servicesRes.error) {
        console.warn('Services enrichment failed (non-fatal):', servicesRes.error)
      }

      const userMap = new Map(((usersRes.data as any[]) || []).map((u: any) => [u.id, u]))
      const svcMap = new Map(((servicesRes.data as any[]) || []).map((s: any) => [s.id, s.name]))
      const skillsByProvider = new Map<string, { id: number; name: string }[]>()

      for (const link of ((skillsRes.data as any[]) || [])) {
        if (!link.skill_id || !link.skills) continue
        const arr = skillsByProvider.get(link.provider_id) || []
        arr.push({ id: link.skill_id, name: (link.skills as any).name })
        skillsByProvider.set(link.provider_id, arr)
      }

      const enriched: ProviderApplication[] = data.map((sp: any) => {
        const u: any = userMap.get(sp.user_id) || {}
        return {
          id: sp.id, user_id: sp.user_id, service_id: sp.service_id,
          bio: sp.bio, years_experience: sp.years_experience,
          verification_status: sp.verification_status,
          profile_photo_url: sp.profile_photo_url ?? null,
          certificate_url: sp.certificate_url ?? null,
          applied_at: sp.created_at ?? sp.applied_at ?? null,
          updated_at: sp.updated_at,
          service_name: svcMap.get(sp.service_id) || t('general_service', 'General Service'),
          full_name: u.full_name || t('provider', 'Provider'), email: u.email || '',
          phone: u.phone || null, city: u.city || null, state: u.state || null,
          avatar_url: u.avatar_url || null,
          latitude: sp.latitude ?? u.latitude ?? null,
          longitude: sp.longitude ?? u.longitude ?? null,
          skills: skillsByProvider.get(sp.id) || [],
        }
      })
      setApplications(enriched)

      if ((rpcErr as any)?.code === '42703') {
        console.warn(
          'Hint: run the pending Supabase migrations in order (at minimum 0005 and 0010) — see MIGRATION_INSTRUCTIONS.md / Supabase SQL editor — to re-enable the high-fidelity admin RPC and GPS matching.'
        )
      }
    } catch (err: any) {
      console.error('Error fetching verification applications:', err)
      const msg = (err && typeof err.message === 'string' && err.message.trim())
        ? err.message
        : (err && typeof err.error_description === 'string' ? err.error_description : '')
      if (msg && /does not exist|column|permission|RLS/i.test(msg)) {
        setError(`${msg} — check that pending Supabase migrations have been applied (supabase/migrations/0005_add_location_columns.sql and 0010_admin_verification_immutable.sql).`)
      } else {
        setError(msg || t('failed_load_applications', 'Failed to load verification applications.'))
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchApplications()
  }, [])

  const handleFinalizeStatus = async (providerId: string, newStatus: 'verified' | 'rejected') => {
    if (!confirm(t('confirm_finalize_status', `Are you sure you want to ${newStatus === 'verified' ? 'APPROVE' : 'REJECT'} this provider? This decision is permanent and cannot be undone.`))) {
      return
    }

    setUpdatingId(providerId)
    try {
      const { error: rpcErr } = await supabase
        .rpc('admin_finalize_provider_status', {
          p_provider_id: providerId,
          p_status: newStatus
        })

      if (rpcErr) {
        const { error: legacyErr } = await supabase
          .rpc('admin_update_provider_status', {
            p_provider_id: providerId,
            p_status: newStatus
          })

        if (legacyErr) {
          const { error: tableErr } = await supabase
            .from('service_providers')
            .update({
              verification_status: newStatus,
              updated_at: new Date().toISOString()
            })
            .eq('id', providerId)
            .eq('verification_status', 'pending')

          if (tableErr) throw tableErr
        }
      }

      setApplications(prev =>
        prev.map(app => (app.id === providerId ? { ...app, verification_status: newStatus } : app))
      )
    } catch (err) {
      console.error('Error finalizing verification status:', err)
      const msg = err instanceof Error ? err.message : t('failed_update_status', 'Failed to update status.')
      alert(`${t('failed_update_status', 'Failed to update status')}: ${msg}`)
    } finally {
      setUpdatingId(null)
    }
  }

  const filteredApplications = applications.filter(app => {
    if (activeTab === 'pending') {
      return app.verification_status === 'pending' || app.verification_status === 'unverified'
    }
    if (activeTab === 'verified') return app.verification_status === 'verified'
    if (activeTab === 'rejected') return app.verification_status === 'rejected'
    return true
  })

  const countByStatus = {
    pending: applications.filter(a => a.verification_status === 'pending' || a.verification_status === 'unverified').length,
    verified: applications.filter(a => a.verification_status === 'verified').length,
    rejected: applications.filter(a => a.verification_status === 'rejected').length,
    all: applications.length,
  }

  return (
    <DashboardLayout role="admin" pageTitle={t('verification_queue', 'Verification Queue')} pageSubtitle={t('approve_reject_applications', 'Approve or reject service provider applications.')}>
      {/* Tab Filter Navigation */}
      <div className="flex flex-wrap items-center gap-2 mb-6 border-b border-slate-200 pb-3">
        {(
          [
            { id: 'pending', label: t('pending_review', 'Pending Review'), count: countByStatus.pending, color: '#d97706' },
            { id: 'verified', label: t('approved', 'Approved'), count: countByStatus.verified, color: '#16a34a' },
            { id: 'rejected', label: t('rejected', 'Rejected'), count: countByStatus.rejected, color: '#dc2626' },
            { id: 'all', label: t('all_applications', 'All Applications'), count: countByStatus.all, color: '#475569' },
          ] as const
        ).map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-2 transition-colors ${
              activeTab === tab.id
                ? 'bg-slate-900 text-white shadow-sm'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            <span>{tab.label}</span>
            <span
              className="px-1.5 py-0.5 rounded-full text-[10px] font-bold"
              style={{
                backgroundColor: activeTab === tab.id ? 'rgba(255,255,255,0.2)' : `${tab.color}15`,
                color: activeTab === tab.id ? '#ffffff' : tab.color,
              }}
            >
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* Main Content */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-16 bg-white rounded-xl border border-slate-200">
          <div className="w-8 h-8 border-4 border-slate-800 border-t-transparent rounded-full animate-spin mb-3" />
          <p className="text-xs text-slate-500 font-medium">{t('loading_applications', 'Loading applications...')}</p>
        </div>
      ) : error ? (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm flex items-center gap-3">
          <AlertCircleIcon className="w-5 h-5 flex-shrink-0" style={{ color: '#dc2626' }} />
          <span>{error}</span>
          <button
            onClick={fetchApplications}
            className="ml-auto text-xs font-semibold underline text-red-800 hover:text-red-900"
          >
            {t('retry', 'Retry')}
          </button>
        </div>
      ) : filteredApplications.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border border-slate-200">
          <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-3 text-slate-400">
            <ShieldCheckIcon className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-semibold text-slate-900">{t('no_applications_found', 'No applications found')}</h3>
          <p className="text-xs text-slate-500 mt-1">{t('no_applications_filter', 'There are no applications matching the current filter.')}</p>
        </div>
      ) : (
        <div className="space-y-6">
          {filteredApplications.map(app => {
            const photoUrl = app.profile_photo_url || app.avatar_url
            const fullName = app.full_name || t('unnamed_provider', 'Unnamed Provider')
            const serviceName = app.service_name || t('general_service', 'General Service')
            const city = app.city || t('location_not_specified', 'Location not specified')
            const state = app.state
            const locationStr = state ? `${city}, ${state}` : city
            const isDecided = app.verification_status === 'verified' || app.verification_status === 'rejected'
            const appliedDate = app.applied_at ? new Date(app.applied_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '-'

            return (
              <div
                key={app.id}
                className={`bg-white rounded-2xl border p-6 shadow-sm transition-all hover:shadow-md ${
                  isDecided
                    ? app.verification_status === 'verified' ? 'border-emerald-200' : 'border-rose-200'
                    : 'border-slate-200'
                }`}
              >
                {/* Header row */}
                <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
                  {/* Left: Photo + Core details */}
                  <div className="flex gap-5 flex-1">
                    <div
                      className="relative flex-shrink-0 cursor-pointer group"
                      onClick={() => photoUrl && setSelectedPhotoUrl(photoUrl)}
                    >
                      {photoUrl ? (
                        <img
                          src={photoUrl}
                          alt={fullName}
                          className="w-20 h-20 rounded-2xl object-cover border-2 border-white shadow-sm group-hover:opacity-90 transition"
                        />
                      ) : (
                        <div className="w-20 h-20 rounded-2xl bg-slate-800 flex items-center justify-center text-white text-2xl font-bold border-2 border-white shadow-sm">
                          {fullName.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <div
                        className="absolute -bottom-1.5 -right-1.5 w-6 h-6 rounded-full border-2 border-white flex items-center justify-center text-[11px] font-bold text-white shadow-sm"
                        style={{
                          backgroundColor:
                            app.verification_status === 'verified' ? '#16a34a'
                              : app.verification_status === 'rejected' ? '#dc2626'
                              : '#d97706',
                        }}
                      >
                        {app.verification_status === 'verified' ? '✓'
                          : app.verification_status === 'rejected' ? '✕'
                          : '⏳'}
                      </div>
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2.5 flex-wrap mb-1.5">
                        <h3 className="text-lg font-bold text-slate-900 leading-tight">{fullName}</h3>
                        <span
                          className="text-[10px] font-extrabold px-2 py-0.5 rounded-md uppercase tracking-widest"
                          style={{
                            backgroundColor:
                              app.verification_status === 'verified' ? '#dcfce7'
                                : app.verification_status === 'rejected' ? '#fee2e2'
                                : '#fef3c7',
                            color:
                              app.verification_status === 'verified' ? '#15803d'
                                : app.verification_status === 'rejected' ? '#b91c1c'
                                : '#b45309',
                          }}
                        >
                          {app.verification_status}
                        </span>
                      </div>

                      <div className="flex flex-col gap-2 text-[13px] text-slate-600 mt-3">
                        <div className="flex items-center gap-2 font-medium">
                          <WrenchIcon className="w-4 h-4 text-slate-400" />
                          <span className="text-slate-900">{serviceName}</span>
                        </div>
                        <div className="flex items-center gap-2 text-slate-500">
                          <LocationIcon className="w-4 h-4 text-slate-400" />
                          <span>{locationStr}</span>
                        </div>
                        <div className="flex items-center gap-2 text-slate-500">
                          <ClockIcon className="w-4 h-4 text-slate-400" />
                          <span>{app.years_experience || '0'} {t('years_experience', 'years experience')}</span>
                        </div>
                      </div>

                      <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 text-[13px]">
                        <div className="flex flex-col">
                          <span className="text-[11px] font-bold uppercase text-slate-400 tracking-wider mb-0.5">{t('email', 'Email')}</span>
                          <span className="font-medium text-slate-800 truncate">{app.email || '-'}</span>
                        </div>
                        <div className="flex flex-col">
                          <span className="text-[11px] font-bold uppercase text-slate-400 tracking-wider mb-0.5">{t('phone', 'Phone')}</span>
                          <span className="font-medium text-slate-800">{app.phone || '-'}</span>
                        </div>
                        <div className="flex flex-col">
                          <span className="text-[11px] font-bold uppercase text-slate-400 tracking-wider mb-0.5">{t('applied_on', 'Applied On')}</span>
                          <span className="font-medium text-slate-800">{appliedDate}</span>
                        </div>
                      </div>

                      {app.bio && (
                        <div className="mt-5">
                          <span className="text-[11px] font-bold uppercase text-slate-400 tracking-wider mb-1.5 block">{t('bio', 'Bio')}</span>
                          <p className="text-sm text-slate-700 bg-slate-50 p-3.5 rounded-xl border border-slate-100 leading-relaxed italic">
                            "{app.bio}"
                          </p>
                        </div>
                      )}

                      {app.skills && app.skills.length > 0 && (
                        <div className="mt-5">
                          <span className="text-[11px] font-bold uppercase text-slate-400 tracking-wider mb-2 block">{t('submitted_skills', 'Submitted Skills')}</span>
                          <div className="flex flex-wrap gap-2">
                            {app.skills.map((sk, idx) => (
                              <span key={sk.id || idx} className="px-3 py-1 rounded-lg text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-100">
                                {sk.name}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Right: Actions & Docs */}
                  <div className="flex flex-col gap-4 min-w-[180px]">
                    {/* Documents */}
                    <div className="flex flex-col gap-2">
                      <span className="text-[11px] font-bold uppercase text-slate-400 tracking-wider mb-1">{t('documents', 'Documents')}</span>
                      {app.certificate_url ? (
                        <button
                          onClick={() => handleViewCertificate(app.certificate_url!)}
                          disabled={certLoading}
                          className="text-sm font-semibold text-blue-600 hover:text-blue-700 bg-blue-50 px-4 py-2.5 rounded-xl border border-blue-100 transition flex items-center justify-center gap-2 shadow-sm disabled:opacity-60"
                        >
                          📜 {certLoading ? t('loading', 'Loading...') : t('view_certificate', 'View Certificate')}
                        </button>
                      ) : (
                        <div className="px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-100 text-center text-xs text-slate-400 italic">
                          {t('no_certificate_uploaded', 'No certificate uploaded')}
                        </div>
                      )}
                    </div>

                    {/* Verification Actions */}
                    <div className="flex flex-col gap-2 mt-2">
                      <span className="text-[11px] font-bold uppercase text-slate-400 tracking-wider mb-1">{t('decision', 'Decision')}</span>
                      {isDecided ? (
                        <div className={`px-4 py-3 rounded-xl text-center text-xs font-bold shadow-sm ${
                          app.verification_status === 'verified'
                            ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                            : 'bg-rose-50 text-rose-800 border border-rose-200'
                        }`}>
                          {app.verification_status === 'verified'
                            ? t('provider_approved_permanently', '✓ Provider Approved Permanently')
                            : t('provider_rejected_permanently', '✕ Provider Rejected Permanently')}
                        </div>
                      ) : (
                        <div className="flex flex-col gap-2">
                          <button
                            onClick={() => handleFinalizeStatus(app.id, 'verified')}
                            disabled={updatingId === app.id}
                            className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold rounded-xl transition-all shadow-sm disabled:opacity-50 flex items-center justify-center gap-2 w-full"
                          >
                            <CheckCircleIcon className="w-4 h-4" />
                            {t('approve_provider', 'Approve Provider')}
                          </button>

                          <button
                            onClick={() => handleFinalizeStatus(app.id, 'rejected')}
                            disabled={updatingId === app.id}
                            className="px-4 py-2.5 bg-white hover:bg-rose-50 text-rose-700 border-2 border-rose-200 text-sm font-bold rounded-xl transition-all shadow-sm disabled:opacity-50 flex items-center justify-center gap-2 w-full"
                          >
                            <CloseIcon className="w-4 h-4" />
                            {t('reject_application', 'Reject Application')}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Profile Photo Modal */}
      {selectedPhotoUrl && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setSelectedPhotoUrl(null)}>
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl relative" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b pb-3 mb-4">
              <h3 className="font-bold text-slate-900 text-base">{t('provider_profile_photo', 'Provider Profile Photo')}</h3>
              <button
                onClick={() => setSelectedPhotoUrl(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
              >
                <CloseIcon className="w-5 h-5" />
              </button>
            </div>
            <div className="flex items-center justify-center bg-slate-50 rounded-xl p-2 border border-slate-200">
              <img
                src={selectedPhotoUrl}
                alt="Provider Profile"
                className="max-w-full max-h-[70vh] object-contain rounded-lg shadow-sm"
              />
            </div>
          </div>
        </div>
      )}

      {/* Certificate Modal */}
      {selectedCertUrl && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setSelectedCertUrl(null)}>
          <div className="bg-white rounded-2xl max-w-3xl w-full p-6 shadow-2xl relative" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b pb-3 mb-4">
              <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                📜 {t('provider_qualification_certificate', 'Provider Qualification Certificate')}
              </h3>
              <button
                onClick={() => setSelectedCertUrl(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
              >
                <CloseIcon className="w-5 h-5" />
              </button>
            </div>
            <div className="max-h-[70vh] overflow-auto flex items-center justify-center bg-slate-900/5 rounded-xl p-2 border border-slate-200">
              {isPdfUrl(selectedCertUrl) ? (
                <iframe src={selectedCertUrl} className="w-full h-[600px] rounded-lg" title="Certificate Document" />
              ) : (
                <img
                  src={selectedCertUrl}
                  alt="Provider Certificate"
                  className="max-w-full max-h-[65vh] object-contain rounded-lg shadow-sm"
                />
              )}
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  )
}
