import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { useTranslation } from 'react-i18next'
import DashboardLayout from '@/components/DashboardLayout'
import { supabase } from '@/lib/supabase'
import { fetchProviderHomeData, updateBookingStatus, BookingWithDetails } from '@/lib/providers'
import { acceptRequest } from '@/lib/bookings'
import type { BookingStatus } from '@/types/database'
import BookingChatModal from '@/components/BookingChatModal'
import {
  CheckCircleIcon, StarIcon, ClockIcon, CalendarIcon,
  CurrencyRupeeIcon, BoltIcon, ClipboardListIcon, ArrowRightIcon,
  LocationIcon, WrenchIcon, ShieldCheckIcon, PhoneIcon, ChatBubbleIcon, ExternalLinkIcon
} from '@/components/Icons'

const ProviderDashboard = () => {
  const { user } = useAuth()
  const { t } = useTranslation()
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<any>(null)
  const [chatBooking, setChatBooking] = useState<BookingWithDetails | null>(null)

  useEffect(() => {
    if (user?.id) {
      loadData()
    }
  }, [user?.id])

  // Realtime subscription for incoming bookings & updates
  useEffect(() => {
    if (!data?.provider?.id) return

    const providerId = data.provider.id

    // Subscribe to assigned bookings
    const channel = supabase
      .channel(`provider-bookings-${providerId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'bookings',
          filter: `provider_id=eq.${providerId}`,
        },
        () => {
          loadData()
        }
      )
      .subscribe()

    // Subscribe to broadcast requests (new incoming requests)
    const broadcastChannel = supabase
      .channel('provider-broadcast-requests')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'bookings',
          filter: `status=eq.broadcast`,
        },
        () => {
          loadData() // Reload to get new incoming requests
        }
      )
      .subscribe()

    // Polling fallback every 10 seconds for instant sync
    const pollInterval = setInterval(() => {
      loadData()
    }, 10000)

    return () => {
      clearInterval(pollInterval)
      supabase.removeChannel(channel)
      supabase.removeChannel(broadcastChannel)
    }
  }, [data?.provider?.id])


  const loadData = async () => {
    try {
      setLoading(true)
      const res = await fetchProviderHomeData(user!.id)
      setData(res)
    } catch (err) {
      console.error('Failed to load provider data:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleUpdateStatus = async (bookingId: string, status: BookingStatus) => {
    try {
      await updateBookingStatus(bookingId, status)
      await loadData()
    } catch (err) {
      console.error('Failed to update status:', err)
      alert("Failed to update status. Please try again.")
    }
  }

  const handleAcceptBroadcastRequest = async (bookingId: string) => {
    if (!data?.provider?.id) {
      alert('Could not identify your provider profile. Please try again.')
      return
    }

    try {
      // Use atomic acceptRequest to prevent race conditions
      const result = await acceptRequest(bookingId, data.provider.id)

      if (result.success) {
        alert('Request accepted successfully!')
        await loadData()
      } else {
        alert(result.error || 'Failed to accept request. The request may have already been taken.')
        await loadData() // Reload to remove the request from list if it was already accepted
      }
    } catch (err) {
      console.error('Failed to accept request:', err)
      alert("Failed to accept request. Please try again.")
    }
  }

  if (loading) {
    return (
      <DashboardLayout role="provider" pageTitle={t('provider_dashboard_title', 'Provider Dashboard')} pageSubtitle={t('loading_dashboard', 'Loading your dashboard...')}>
        <div className="flex items-center justify-center p-12">
          <div className="w-8 h-8 rounded-full border-4 border-slate-200 border-t-blue-600 animate-spin"></div>
        </div>
      </DashboardLayout>
    )
  }

  if (!data?.provider) {
    return (
      <DashboardLayout role="provider" pageTitle={t('provider_dashboard_title', 'Provider Dashboard')} pageSubtitle={t('profile_incomplete', 'Profile incomplete')}>
         <div className="bg-amber-50 border border-amber-200 rounded-xl p-6 text-center shadow-sm max-w-xl mx-auto">
           <div className="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-3">
             <ShieldCheckIcon className="w-6 h-6 text-amber-600" />
           </div>
           <h3 className="text-lg font-semibold text-amber-900 mb-2">{t('profile_incomplete_title', 'Profile Incomplete')}</h3>
           <p className="text-amber-700 mb-4 text-sm">{t('finish_setting_up', 'Please finish setting up your provider profile to receive requests.')}</p>
           <Link to="/provider-onboarding" className="inline-block px-5 py-2.5 bg-amber-600 text-white font-semibold rounded-lg hover:bg-amber-700 transition-colors">
             {t('complete_profile', 'Complete Profile')}
           </Link>
         </div>
      </DashboardLayout>
    )
  }

  const { provider, pendingRequests, acceptedRequests, incomingRequests, stats } = data

  const isPending = provider.verification_status !== 'verified'

  if (isPending) {
    return (
      <DashboardLayout role="provider" pageTitle={t('provider_dashboard_title', 'Provider Dashboard')} pageSubtitle={t('account_status', 'Account Status')}>
        <div className="max-w-3xl mx-auto space-y-6">
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6 shadow-sm flex items-start gap-4">
            <div className="bg-amber-100 p-2.5 rounded-xl text-amber-600 flex-shrink-0">
               <ShieldCheckIcon className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-amber-900 text-lg">{t('pending_admin_approval', 'Pending Admin Approval')}</h3>
              <p className="text-sm text-amber-700 mt-1.5 leading-relaxed">
                {t('pending_approval_desc', 'Your service provider account is currently under review by our administrators. You will be able to receive and accept customer requests once your profile is approved.')}
              </p>
              <div className="mt-4 flex items-center gap-2">
                 <span className="inline-flex items-center px-2.5 py-1 rounded-md text-[11px] font-bold tracking-wider uppercase bg-amber-200/50 text-amber-800 border border-amber-200">
                   {t('status_status', 'Status')}: {provider.verification_status}
                 </span>
                 <Link to="/provider/profile" className="text-xs font-semibold text-blue-600 hover:text-blue-700">
                   {t('view_profile', 'View Profile')}
                 </Link>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
            <h2 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4">{t('your_profile_details', 'Your Profile Details')}</h2>
            <div className="flex flex-col md:flex-row gap-6 items-start">
              <div className="w-24 h-24 rounded-2xl bg-slate-100 flex items-center justify-center overflow-hidden flex-shrink-0 border border-slate-200 shadow-sm">
                {provider.user?.avatar_url || provider.profile_photo_url ? (
                  <img src={provider.user?.avatar_url || provider.profile_photo_url} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-2xl font-bold text-slate-400">
                    {provider.user?.full_name?.charAt(0) || 'U'}
                  </span>
                )}
              </div>
              <div className="flex-1 space-y-3 pt-1">
                <div>
                  <h3 className="text-xl font-bold text-slate-900">{provider.user?.full_name}</h3>
                  <p className="text-sm text-slate-500 font-medium">{provider.service?.name || t('uncategorized_service', 'Uncategorized Service')}</p>
                </div>

                <div className="flex flex-wrap gap-x-5 gap-y-2 text-sm text-slate-600">
                  <span className="flex items-center gap-1.5 bg-slate-50 px-2 py-1 rounded-md border border-slate-100">
                    <LocationIcon className="w-4 h-4 text-slate-400" />
                    {provider.user?.city || t('location_not_set', 'Location not set')}
                  </span>
                  <span className="flex items-center gap-1.5 bg-slate-50 px-2 py-1 rounded-md border border-slate-100">
                     <WrenchIcon className="w-4 h-4 text-slate-400" />
                     {provider.years_experience || '0'} {t('years_experience_suffix', 'years experience')}
                  </span>
                </div>

                {provider.bio && (
                  <div className="mt-4 pt-4 border-t border-slate-100">
                    <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">{t('about_me', 'About Me')}</h4>
                    <p className="text-sm text-slate-700 leading-relaxed bg-slate-50 p-3 rounded-lg border border-slate-100">{provider.bio}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout role="provider" pageTitle={t('provider_dashboard_title', 'Provider Dashboard')} pageSubtitle={t('manage_incoming_jobs', 'Manage your incoming jobs, active bookings, and earnings.')}>

      {/* Note: Go Live toggle has been moved to the Provider Homepage */}

      {/* Stats row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          { label: t('incoming_requests', 'Incoming'), value: stats.incomingCount.toString(), icon: ClipboardListIcon, color: '#8b5cf6', bg: '#f5f3ff', isNew: true },
          { label: t('pending_label', 'Pending'), value: stats.pendingCount.toString(), icon: ClockIcon, color: '#64748b', bg: '#f1f5f9', isNew: false },
          { label: t('active_jobs_label', 'Active Jobs'), value: stats.acceptedCount.toString(), icon: CalendarIcon, color: '#475569', bg: '#f1f5f9', isNew: false },
          { label: t('total_earnings_label', 'Total Earnings'), value: `₹${stats.totalEarnings.toLocaleString()}`, icon: CurrencyRupeeIcon, color: '#10b981', bg: '#ecfdf5', isNew: false },
        ].map(stat => (
          <div key={stat.label} className="bg-white rounded-xl border p-4 shadow-sm relative overflow-hidden" style={{borderColor: '#e2e8f0'}}>
            {stat.isNew && stats.incomingCount > 0 && (
              <div className="absolute top-0 right-0 w-3 h-3 bg-red-500 rounded-full animate-pulse" style={{margin: '8px'}}></div>
            )}
            <div className="flex items-center justify-between mb-3">
              <div className="w-9 h-9 rounded-lg flex items-center justify-center bg-slate-50" style={{backgroundColor: stat.bg}}>
                <stat.icon className="w-4 h-4" style={{color: stat.color}} />
              </div>
            </div>
            <p className="text-2xl font-bold" style={{color: '#0f172a', fontFamily: 'Plus Jakarta Sans, sans-serif'}}>{stat.value}</p>
            <p className="text-[11px] font-medium mt-0.5 text-slate-500">{stat.label}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* New requests */}
        <div className="lg:col-span-2 bg-white rounded-xl border shadow-sm flex flex-col" style={{borderColor: '#e2e8f0', minHeight: '400px'}}>
          <div className="p-5 border-b flex items-center justify-between bg-slate-50/50 rounded-t-xl" style={{borderColor: '#f1f5f9'}}>
            <div>
              <h2 className="text-sm font-bold" style={{color: '#0f172a'}}>{t('new_service_requests', 'New Service Requests')}</h2>
              <p className="text-[11px] mt-0.5 font-medium" style={{color: '#64748b'}}>{pendingRequests.length} {t('waiting_response', 'waiting for your response')}</p>
            </div>
            {pendingRequests.length > 0 && (
              <Link to="/provider/requests" className="text-xs font-semibold inline-flex items-center gap-1 hover:text-blue-700 transition-colors" style={{color: 'var(--color-primary)'}}>
                {t('view_all_requests', 'View all')} <ArrowRightIcon className="w-3 h-3" />
              </Link>
            )}
          </div>

          <div className="divide-y flex-1 overflow-y-auto" style={{borderColor: '#f1f5f9'}}>
            {pendingRequests.length === 0 ? (
              <div className="p-12 text-center text-slate-500 flex flex-col items-center justify-center h-full">
                <div className="w-12 h-12 bg-slate-50 rounded-xl flex items-center justify-center mb-3">
                  <ClipboardListIcon className="w-6 h-6 text-slate-400" />
                </div>
                <p className="text-sm font-medium text-slate-600">{t('no_new_requests', 'No new service requests')}</p>
                <p className="text-xs text-slate-400 mt-1 max-w-[200px]">{t('you_will_be_notified', 'You will be notified when customers in your area request your service.')}</p>
              </div>
            ) : (
              pendingRequests.map((req: BookingWithDetails) => (
                <div key={req.id} className="p-5 flex flex-col sm:flex-row gap-4 hover:bg-slate-50 transition-colors">
                  <div className="hidden sm:flex w-10 h-10 rounded-lg bg-blue-50 items-center justify-center flex-shrink-0">
                    <BoltIcon className="w-5 h-5 text-blue-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-sm font-bold truncate text-slate-900">{req.service?.name || t('service_request', 'Service Request')}</p>
                      <span className="text-sm font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-100">
                        ₹{req.amount || 0}
                      </span>
                    </div>

                    <div className="flex items-center gap-3 mt-1 text-xs text-slate-500 font-medium font-sans">
                      <span className="flex items-center gap-1 bg-slate-100 px-1.5 py-0.5 rounded">
                        <ClockIcon className="w-3.5 h-3.5" />
                        {req.scheduled_at ? new Date(req.scheduled_at).toLocaleString('en-IN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'ASAP'}
                      </span>
                      {req.distance_km && (
                        <span className="flex items-center gap-1">
                          <LocationIcon className="w-3.5 h-3.5" /> {req.distance_km.toFixed(1)} km away
                        </span>
                      )}
                    </div>

                    <div className="mt-3 flex items-center gap-2">
                      {req.customer?.avatar_url ? (
                        <img src={req.customer.avatar_url} alt="" className="w-5 h-5 rounded-full object-cover border border-slate-200" />
                      ) : (
                        <div className="w-5 h-5 rounded-full bg-slate-200 flex items-center justify-center text-[9px] font-bold text-slate-500">
                          {req.customer?.full_name?.charAt(0) || 'C'}
                        </div>
                      )}
                      <span className="text-xs font-semibold text-slate-700">{req.customer?.full_name || t('customer', 'Customer')}</span>
                    </div>

                    {req.address && (
                      <p className="mt-2 text-xs text-slate-600 bg-slate-100 p-2 rounded flex items-center gap-1.5">
                        <LocationIcon className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                        <span>{req.address}</span>
                      </p>
                    )}

                    {req.notes && (
                      <p className="mt-1 text-xs text-slate-500 italic bg-amber-50/60 border border-amber-100 p-2 rounded">
                        "{req.notes}"
                      </p>
                    )}
                  </div>

                  <div className="flex sm:flex-col gap-2 mt-3 sm:mt-0 flex-shrink-0 justify-center">
                    <button
                      onClick={() => handleAcceptBroadcastRequest(req.id)}
                      className="flex-1 sm:flex-none px-4 py-2 rounded-lg text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-sm transition-colors"
                    >
                      Accept
                    </button>
                    <button
                      onClick={() => {
                        if (confirm('Decline this request? It will be removed from your list but remain available to other providers.')) {
                          setData((prev: any) => ({
                            ...prev,
                            pendingRequests: prev.pendingRequests.filter((r: BookingWithDetails) => r.id !== req.id)
                          }))
                        }
                      }}
                      className="flex-1 sm:flex-none px-4 py-2 rounded-lg text-xs font-semibold border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors"
                    >
                      Decline
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right column: Earnings + Upcoming */}
        <div className="space-y-6">
          {/* Active / Upcoming bookings */}
          <div className="bg-white rounded-xl border shadow-sm p-5 flex flex-col" style={{borderColor: '#e2e8f0', minHeight: '280px'}}>
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
              <h2 className="text-sm font-bold" style={{color: '#0f172a'}}>{t('active_upcoming', 'Active Jobs')}</h2>
              <Link to="/provider/bookings" className="text-xs font-semibold text-blue-600 hover:text-blue-700">View all</Link>
            </div>

            <div className="space-y-3 flex-1 overflow-y-auto">
              {acceptedRequests.length === 0 ? (
                <div className="text-center text-slate-500 text-sm py-6">
                  {t('no_active_jobs', 'No active jobs right now.')}
                </div>
              ) : (
                acceptedRequests.map((job: BookingWithDetails) => (
                  <div key={job.id} className="p-3.5 rounded-xl border border-slate-100 shadow-sm space-y-2.5" style={{backgroundColor: '#f8fafc'}}>
                    <div className="flex justify-between items-start mb-1">
                      <p className="text-sm font-bold text-slate-900 truncate pr-2">{job.service?.name}</p>
                      <span
                        className="inline-flex text-[9px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wider border flex-shrink-0"
                        style={{
                          backgroundColor: job.status === 'in_progress' ? 'var(--color-primary-tint)' : 'var(--color-primary-tint)',
                          color: job.status === 'in_progress' ? '#c2410c' : 'var(--color-primary)',
                          borderColor: job.status === 'in_progress' ? 'var(--color-accent-tint)' : 'var(--color-border)'
                        }}
                      >
                        {job.status === 'in_progress' ? 'In Progress' : 'Confirmed'}
                      </span>
                    </div>
                    <p className="text-xs font-medium text-slate-500 flex items-center gap-1.5 mb-2">
                      <CalendarIcon className="w-3 h-3" />
                      {job.scheduled_at ? new Date(job.scheduled_at).toLocaleString('en-IN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'ASAP'}
                    </p>

                    {/* Customer contact info */}
                    <div className="p-2.5 bg-white rounded-lg border border-slate-200 space-y-2">
                      <div className="flex items-center gap-2">
                        {job.customer?.avatar_url ? (
                          <img src={job.customer.avatar_url} alt="" className="w-6 h-6 rounded-full object-cover border border-slate-200" />
                        ) : (
                          <div className="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center text-[9px] font-bold text-slate-500">
                            {job.customer?.full_name?.charAt(0) || 'C'}
                          </div>
                        )}
                        <div className="flex-1">
                          <p className="text-xs font-semibold text-slate-900">{job.customer?.full_name || t('customer', 'Customer')}</p>
                          {job.customer?.phone && (
                            <p className="text-[11px] text-slate-500 font-medium">{job.customer.phone}</p>
                          )}
                        </div>
                      </div>

                      {/* Call & Chat buttons */}
                      <div className="flex gap-1.5">
                        {job.customer?.phone && (
                          <a
                            href={`tel:${job.customer.phone}`}
                            className="flex-1 inline-flex items-center justify-center gap-1 px-2 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-[10px] font-bold rounded-lg border border-emerald-200 transition-colors"
                          >
                            <PhoneIcon className="w-3 h-3" />
                            {t('call', 'Call')}
                          </a>
                        )}
                        <button
                          onClick={() => setChatBooking(job)}
                          className="flex-1 inline-flex items-center justify-center gap-1 px-2 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 text-[10px] font-bold rounded-lg border border-blue-200 transition-colors"
                        >
                          <ChatBubbleIcon className="w-3 h-3" />
                          {t('chat', 'Chat')}
                        </button>
                      </div>

                      {/* Address with Google Maps link */}
                      {(job.address || (job.latitude && job.longitude)) && (
                        <div className="pt-1 border-t border-slate-200">
                          <p className="text-[10px] text-slate-600 flex items-start gap-1.5 mb-1.5">
                            <LocationIcon className="w-3 h-3 flex-shrink-0 mt-0.5 text-slate-400" />
                            <span>{job.address || 'Location provided'}</span>
                          </p>
                          <a
                            href={
                              job.latitude && job.longitude
                                ? `https://maps.google.com/?q=${job.latitude},${job.longitude}`
                                : job.address
                                  ? `https://maps.google.com/?q=${encodeURIComponent(job.address)}`
                                  : '#'
                            }
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 px-2 py-1 bg-red-50 hover:bg-red-100 text-red-700 text-[10px] font-bold rounded-lg border border-red-200 transition-colors"
                          >
                            <ExternalLinkIcon className="w-2.5 h-2.5" />
                            {t('open_in_google_maps', 'Maps')}
                          </a>
                        </div>
                      )}
                    </div>

                    <div className="flex gap-2">
                      {job.status === 'confirmed' && (
                        <button
                          onClick={() => handleUpdateStatus(job.id, 'in_progress')}
                          className="flex-1 text-[11px] font-semibold py-2 px-3 border border-blue-200 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors shadow-sm"
                        >
                          {t('start_job_provider', 'Start Job')}
                        </button>
                      )}
                      {job.status === 'in_progress' && (
                        <button
                          onClick={() => handleUpdateStatus(job.id, 'completed')}
                          className="flex-1 text-[11px] font-semibold py-2 px-3 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg hover:bg-emerald-100 transition-colors shadow-sm"
                        >
                          {t('mark_complete_provider', 'Mark Complete')}
                        </button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Quick Stats / Feedback */}
          <div className="bg-white rounded-xl border shadow-sm p-5" style={{borderColor: '#e2e8f0'}}>
             <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
              <h2 className="text-sm font-bold" style={{color: '#0f172a'}}>{t('earnings_summary', 'Earnings Summary')}</h2>
              <Link to="/provider/earnings" className="text-xs font-semibold text-emerald-600 hover:text-emerald-700">{t('details_link', 'Details')}</Link>
            </div>
            <div className="text-3xl font-bold mb-1" style={{color: '#10b981', fontFamily: 'Plus Jakarta Sans, sans-serif'}}>
              ₹{stats.totalEarnings.toLocaleString('en-IN')}
            </div>
            <p className="text-xs font-medium text-slate-500 mb-4">{t('total_lifetime', 'Total lifetime earnings')}</p>

            <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 flex items-center justify-between">
               <span className="text-xs font-semibold text-slate-700">{t('completed_jobs_provider', 'Completed Jobs')}</span>
               <span className="text-sm font-bold text-slate-900">{stats.completedCount}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Chat Modal */}
      {chatBooking && chatBooking.customer && (
        <BookingChatModal
          bookingId={chatBooking.id}
          recipientName={chatBooking.customer.full_name || 'Customer'}
          onClose={() => setChatBooking(null)}
        />
      )}
    </DashboardLayout>
  )
}

export default ProviderDashboard
