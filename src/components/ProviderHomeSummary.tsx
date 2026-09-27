import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { supabase } from '@/lib/supabase'
import { fetchProviderHomeData, updateBookingStatus, BookingWithDetails } from '@/lib/providers'
import { acceptRequest } from '@/lib/bookings'
import { getCurrentLocation, watchLocation } from '@/lib/geolocation'
import type { BookingStatus } from '@/types/database'
import {
  ClipboardListIcon, CalendarIcon, StarIcon, CurrencyRupeeIcon,
  ArrowRightIcon, BoltIcon, ClockIcon, LocationIcon, CheckCircleIcon
} from '@/components/Icons'

const ProviderHomeSummary = () => {
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<any>(null)
  const [providerId, setProviderId] = useState<string | null>(null)

  // Live tracking state
  const [isLive, setIsLive] = useState(false)
  const watchId = useRef<number | null>(null)
  const [trackingStatus, setTrackingStatus] = useState<string | null>(null)

  useEffect(() => {
    if (user?.id) {
      loadData()
    }
  }, [user?.id])

  // Cleanup watcher on unmount
  useEffect(() => {
    return () => {
      if (watchId.current !== null) {
        if (typeof watchId.current === 'function') {
          (watchId.current as Function)()
        } else {
          navigator.geolocation.clearWatch(watchId.current as number)
        }
      }
    }
  }, [])

  const toggleLiveStatus = async () => {
    if (!user?.id || !data?.provider) return

    const newStatus = !isLive
    setIsLive(newStatus)

    if (newStatus) {
      setTrackingStatus('Fetching location...')
      try {
        const loc = await getCurrentLocation()

        await supabase
          .from('service_providers')
          .update({
            is_available: true,
            latitude: loc.latitude,
            longitude: loc.longitude,
          })
          .eq('user_id', user.id)

        await supabase
          .from('users')
          .update({
            latitude: loc.latitude,
            longitude: loc.longitude,
          })
          .eq('id', user.id)

        setData((prev: any) => ({
          ...prev,
          provider: {
            ...prev.provider,
            is_available: true,
            latitude: loc.latitude,
            longitude: loc.longitude,
          }
        }))

        setTrackingStatus('Live')

        // Start watching for real-time location changes
        const cleanupWatch = watchLocation(
          async (newLoc) => {
             await supabase.from('service_providers').update({ latitude: newLoc.latitude, longitude: newLoc.longitude }).eq('user_id', user.id)
             await supabase.from('users').update({ latitude: newLoc.latitude, longitude: newLoc.longitude }).eq('id', user.id)
          },
          (err) => console.warn('Watch location non-fatal error:', err)
        )
        watchId.current = cleanupWatch as any
      } catch (err) {
        console.error('Location detection failed:', err)
        setIsLive(false)
        setTrackingStatus('Location error. Please enable location permissions and try again.')
      }
    } else {
      setTrackingStatus('Going offline...')
      if (watchId.current) {
        if (typeof watchId.current === 'function') {
           (watchId.current as Function)()
        } else {
           navigator.geolocation.clearWatch(watchId.current as number)
        }
        watchId.current = null
      }

      await supabase
        .from('service_providers')
        .update({ is_available: false })
        .eq('user_id', user.id)

      setData((prev: any) => ({
        ...prev,
        provider: {
          ...prev.provider,
          is_available: false,
        }
      }))

      setTrackingStatus('Offline')
    }
  }

  const loadData = async () => {
    try {
      setLoading(true)
      const res = await fetchProviderHomeData(user!.id)
      setData(res)
      setProviderId(res.provider?.id ?? null)
      setIsLive(res.provider?.is_available || false)
      if (res.provider?.is_available) setTrackingStatus('Live')
    } catch (err) {
      console.error('Failed to load provider data:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleAcceptRequest = async (bookingId: string) => {
    if (!providerId) {
      alert('Could not identify your provider profile. Please try again.')
      return
    }

    try {
      const result = await acceptRequest(bookingId, providerId)

      if (result.success) {
        alert('Request accepted successfully!')
        await loadData()
      } else {
        alert(result.error || 'Failed to accept request. The request may have already been taken.')
        await loadData()
      }
    } catch (err) {
      console.error('Failed to accept request:', err)
      alert("Failed to accept request. Please try again.")
    }
  }

  const handleDeclineRequest = async (bookingId: string) => {
    // For broadcast requests, just remove them from the local view
    // The request stays in the pool for other providers to accept
    const confirmed = confirm('Are you sure you want to decline this request? It will be removed from your list but remain available to other providers.')

    if (confirmed) {
      // Just reload the data - this removes the request from the view
      // without deleting it from the database
      setData((prev: any) => ({
        ...prev,
        incomingRequests: prev.incomingRequests.filter((r: BookingWithDetails) => r.id !== bookingId)
      }))
    }
  }

  const handleUpdateStatus = async (bookingId: string, status: BookingStatus) => {
    try {
      await updateBookingStatus(bookingId, status)
      // Reload data to reflect changes
      await loadData()
    } catch (err) {
      console.error('Failed to update status:', err)
      alert("Failed to update status. Please try again.")
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="w-8 h-8 rounded-full border-4 border-slate-200 border-t-blue-600 animate-spin"></div>
      </div>
    )
  }

  if (!data?.provider) {
    return (
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-6 text-center">
        <AlertCircleIcon className="w-8 h-8 text-amber-500 mx-auto mb-3" />
        <h3 className="text-lg font-semibold text-amber-900 mb-2">Profile Incomplete</h3>
        <p className="text-amber-700 mb-4 text-sm">Please finish setting up your provider profile to receive requests.</p>
        <Link to="/provider-onboarding" className="inline-block px-5 py-2.5 bg-amber-600 text-white font-medium rounded-lg hover:bg-amber-700 transition-colors">
          Complete Profile
        </Link>
      </div>
    )
  }

  const { provider, pendingRequests, acceptedRequests, incomingRequests, stats } = data

  return (
    <div className="max-w-5xl mx-auto py-8 px-4 w-full">
      <div className="mb-8">
        <h1 className="text-2xl font-bold" style={{ color: '#0f172a' }}>
          Welcome back, {provider.user?.full_name?.split(' ')[0] || 'Provider'}
        </h1>
        <p className="text-sm mt-1" style={{ color: '#64748b' }}>
          Service Provider • {provider.service?.name || 'Uncategorized'}
          {provider.verification_status === 'verified' && (
            <span className="inline-flex items-center gap-1 ml-3 text-green-700 bg-green-50 px-2 py-0.5 rounded-full text-[11px] font-medium border border-green-200">
              <CheckCircleIcon className="w-3 h-3" /> Verified
            </span>
          )}
        </p>
      </div>

      {/* Go Live Banner - ONLY on homepage */}
      <div className={`mb-6 p-5 rounded-2xl border shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 transition-all ${isLive ? 'bg-emerald-50 border-emerald-200' : 'bg-slate-50 border-slate-200'}`}>
        <div className="flex items-center gap-4">
          <div className={`w-3 h-3 rounded-full animate-pulse ${isLive ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]' : 'bg-slate-400'}`} />
          <div>
            <div className="flex items-center gap-2">
              <h3 className={`font-bold ${isLive ? 'text-emerald-900' : 'text-slate-900'}`}>
                {isLive ? 'Currently Live' : 'Currently Offline'}
              </h3>
              {trackingStatus && (
                <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-white border border-slate-200 text-slate-600">
                  {trackingStatus}
                </span>
              )}
            </div>
            <p className={`text-xs mt-0.5 ${isLive ? 'text-emerald-700' : 'text-slate-500'}`}>
              {isLive ? 'Your GPS location is being broadcast to nearby customers for discovery.' : 'Go live with your current GPS location so nearby customers can find and book you.'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button
            onClick={toggleLiveStatus}
            className={`flex-1 sm:flex-none px-5 py-2.5 rounded-xl text-xs font-bold shadow-sm transition-all flex items-center justify-center gap-2 ${
              isLive
                ? 'bg-white text-rose-700 border border-rose-200 hover:bg-rose-50'
                : 'bg-emerald-600 text-white hover:bg-emerald-700'
            }`}
          >
            {isLive ? 'Go Offline' : 'Go Live'}
          </button>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'New Requests', value: stats.pendingCount, icon: ClipboardListIcon, color: 'var(--color-primary)', bg: 'var(--color-primary-tint)' },
          { label: 'Active Jobs', value: stats.acceptedCount, icon: CalendarIcon, color: '#475569', bg: '#f1f5f9' },
          { label: 'Avg Rating', value: stats.rating > 0 ? stats.rating.toFixed(1) : 'New', icon: StarIcon, color: '#f59e0b', bg: '#fffbeb' },
          { label: 'Earnings', value: `₹${stats.totalEarnings.toLocaleString()}`, icon: CurrencyRupeeIcon, color: '#10b981', bg: '#ecfdf5' },
        ].map((stat, i) => (
          <div key={i} className="bg-white rounded-2xl border p-5 shadow-sm" style={{ borderColor: '#e2e8f0' }}>
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-blue-50" style={{ backgroundColor: stat.bg }}>
                <stat.icon className="w-5 h-5 text-blue-600" style={{ color: stat.color }} />
              </div>
            </div>
            <p className="text-2xl font-bold font-sans" style={{ color: '#0f172a' }}>{stat.value}</p>
            <p className="text-xs font-medium mt-1" style={{ color: '#64748b' }}>{stat.label}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* New requests */}
        <div className="lg:col-span-2 bg-white rounded-2xl border shadow-sm" style={{ borderColor: '#e2e8f0' }}>
          <div className="p-5 flex items-center justify-between border-b" style={{ borderColor: '#f1f5f9' }}>
            <div>
              <h2 className="text-base font-semibold" style={{ color: '#0f172a' }}>Incoming Requests</h2>
              <p className="text-xs mt-0.5" style={{ color: '#64748b' }}>{incomingRequests.length} waiting for response</p>
            </div>
            {incomingRequests.length > 0 && (
              <Link to="/provider/requests" className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1">
                View all <ArrowRightIcon className="w-3.5 h-3.5" />
              </Link>
            )}
          </div>

          <div className="divide-y" style={{ borderColor: '#f1f5f9' }}>
            {incomingRequests.length === 0 ? (
              <div className="p-8 text-center text-slate-500 text-sm">
                No new service requests right now.
              </div>
            ) : (
              incomingRequests.slice(0, 5).map((req: BookingWithDetails) => (
                <div key={req.id} className="p-5 flex flex-col sm:flex-row sm:items-center gap-4 hover:bg-slate-50 transition-colors">
                  <div className="hidden sm:flex w-12 h-12 rounded-xl bg-blue-50 items-center justify-center flex-shrink-0">
                    <BoltIcon className="w-6 h-6 text-blue-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start mb-1">
                      <p className="text-sm font-semibold truncate" style={{ color: '#0f172a' }}>
                        {req.service?.name || 'Service Request'}
                      </p>
                      <p className="text-sm font-bold text-blue-600">₹{req.amount || 0}</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs" style={{ color: '#64748b' }}>
                      <span className="flex items-center gap-1.5 whitespace-nowrap">
                        <ClockIcon className="w-3.5 h-3.5" />
                        {req.scheduled_at ? new Date(req.scheduled_at).toLocaleString() : 'ASAP'}
                      </span>
                      {req.address && (
                        <span className="flex items-center gap-1.5 truncate">
                          <LocationIcon className="w-3.5 h-3.5" />
                          {req.address}
                        </span>
                      )}
                    </div>
                    <div className="mt-2 text-xs font-medium text-slate-700 flex items-center gap-2">
                      <div className="w-5 h-5 rounded-full bg-slate-200 overflow-hidden">
                        {req.customer?.avatar_url ? (
                          <img src={req.customer.avatar_url} alt="" className="w-full h-full object-cover" />
                        ) : null}
                      </div>
                      {req.customer?.full_name || 'Customer'}
                    </div>
                  </div>
                  <div className="flex sm:flex-col gap-2 mt-2 sm:mt-0 flex-shrink-0">
                    <button
                      onClick={() => handleAcceptRequest(req.id)}
                      className="flex-1 sm:flex-none px-4 py-2 rounded-lg text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 transition-colors"
                    >
                      Accept Job
                    </button>
                    <button
                      onClick={() => handleDeclineRequest(req.id)}
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

        {/* Active bookings */}
        <div className="bg-white rounded-2xl border shadow-sm flex flex-col" style={{ borderColor: '#e2e8f0' }}>
          <div className="p-5 border-b" style={{ borderColor: '#f1f5f9' }}>
            <h2 className="text-base font-semibold" style={{ color: '#0f172a' }}>Active Jobs</h2>
          </div>
          <div className="p-5 flex-1 overflow-y-auto">
            {acceptedRequests.length === 0 ? (
               <div className="text-center text-slate-500 text-sm mt-4">
                 No active jobs.
               </div>
            ) : (
              <div className="space-y-4">
                {acceptedRequests.map((job: BookingWithDetails) => (
                  <div key={job.id} className="border rounded-xl p-4" style={{ borderColor: '#e2e8f0' }}>
                    <div className="flex justify-between items-start mb-2">
                      <p className="text-sm font-semibold truncate text-slate-900">{job.service?.name}</p>
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-100">
                        {job.status === 'in_progress' ? 'In Progress' : 'Confirmed'}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 mb-3">{job.customer?.full_name}</p>
                    <div className="flex gap-2">
                      {job.status === 'confirmed' && (
                        <button
                          onClick={() => handleUpdateStatus(job.id, 'in_progress')}
                          className="flex-1 text-xs font-medium py-1.5 border border-slate-200 rounded text-slate-700 hover:bg-slate-50"
                        >
                          Start Job
                        </button>
                      )}
                      {job.status === 'in_progress' && (
                        <button
                          onClick={() => handleUpdateStatus(job.id, 'completed')}
                          className="flex-1 text-xs font-medium py-1.5 bg-green-50 text-green-700 border border-green-200 rounded hover:bg-green-100"
                        >
                          Mark Complete
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-2xl border shadow-sm p-6" style={{ borderColor: '#e2e8f0' }}>
        <h2 className="text-base font-semibold mb-4" style={{ color: '#0f172a' }}>Quick Actions</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Link to="/provider/requests" className="flex items-center justify-center p-3 text-sm font-medium text-slate-700 border rounded-xl hover:bg-slate-50 transition-colors">
            All Requests
          </Link>
          <Link to="/provider/bookings" className="flex items-center justify-center p-3 text-sm font-medium text-slate-700 border rounded-xl hover:bg-slate-50 transition-colors">
            My Bookings
          </Link>
          <Link to="/provider/earnings" className="flex items-center justify-center p-3 text-sm font-medium text-slate-700 border rounded-xl hover:bg-slate-50 transition-colors">
            Earnings
          </Link>
          <Link to="/provider/profile" className="flex items-center justify-center p-3 text-sm font-medium text-slate-700 border rounded-xl hover:bg-slate-50 transition-colors">
            Profile Settings
          </Link>
        </div>
      </div>
    </div>
  )
}

function AlertCircleIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
    </svg>
  )
}

export default ProviderHomeSummary
