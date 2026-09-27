import { useState, useEffect, useMemo } from 'react'
import { useAuth } from '@/context/AuthContext'
import { useTranslation } from 'react-i18next'
import DashboardLayout from '@/components/DashboardLayout'
import { supabase } from '@/lib/supabase'
import { updateBookingStatus, BookingWithDetails } from '@/lib/providers'
import { acceptRequest } from '@/lib/bookings'
import { calculateDistance } from '@/lib/geolocation'
import type { BookingStatus } from '@/types/database'
import {
  ClockIcon, LocationIcon, BoltIcon, ClipboardListIcon
} from '@/components/Icons'

const ProviderRequests = () => {
  const { user } = useAuth()
  const { t } = useTranslation()
  const [loading, setLoading] = useState(true)
  const [requests, setRequests] = useState<BookingWithDetails[]>([])
  const [providerId, setProviderId] = useState<string | null>(null)
  const [providerLocation, setProviderLocation] = useState<{ latitude: number; longitude: number } | null>(null)

  const loadData = async () => {
    if (!user?.id) return

    try {
      setLoading(true)

      // Get provider ID, service_id, and location
      const { data: provider, error: providerError } = await supabase
        .from('service_providers')
        .select('id, service_id, latitude, longitude')
        .eq('user_id', user.id)
        .single()

      if (providerError) {
        console.error('Error fetching provider:', providerError)
        setLoading(false)
        return
      }

      if (!provider) {
        console.warn('No provider profile found for user:', user.id)
        setLoading(false)
        return
      }

      console.log('Provider found:', provider)
      setProviderId(provider.id)

      // Store provider location for distance filtering
      if (provider.latitude && provider.longitude) {
        setProviderLocation({ latitude: provider.latitude, longitude: provider.longitude })
        console.log('Provider location:', provider.latitude, provider.longitude)
      } else {
        console.warn('Provider has no location set - distance filtering disabled')
      }

      // Fetch broadcast requests (on-demand matching model)
      // These are requests with status 'broadcast' and no provider assigned yet
      const { data: bookingsData, error } = await supabase
        .from('bookings')
        .select('*, customer:users(full_name, avatar_url, phone), service:services(name)')
        .eq('status', 'broadcast')
        .is('provider_id', null)
        .eq('service_id', provider.service_id)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error fetching broadcast requests:', error)
      }

      console.log('Broadcast requests for provider:', bookingsData?.length || 0, bookingsData)
      setRequests(bookingsData || [])
    } catch (err) {
      console.error('Failed to load requests:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [user?.id])

  // Real-time subscription - listen for broadcast requests (on-demand matching model)
  useEffect(() => {
    if (!user?.id) return

    const channel = supabase
      .channel('provider-requests-pool')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'bookings',
          filter: `status=eq.broadcast`,
        },
        () => {
          loadData()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [user?.id])

  const handleAcceptRequest = async (bookingId: string) => {
    if (!providerId) {
      alert('Could not identify your provider profile. Please try again.')
      return
    }

    try {
      // Use atomic acceptRequest to prevent race conditions
      const result = await acceptRequest(bookingId, providerId)

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

  const handleDeclineRequest = async (bookingId: string) => {
    // Don't cancel the request - just acknowledge and it disappears from this provider's view
    // The request stays in the pool for other providers to accept
    const confirmed = confirm('Are you sure you want to decline this request? It will be removed from your list but remain available to other providers.')

    if (confirmed) {
      // Just reload the data - the request disappears from this provider's view
      // (it stays in the pool for other providers)
      setRequests(prev => prev.filter(req => req.id !== bookingId))
    }
  }

  // Filter requests within 10km of provider's location
  const filteredRequests = useMemo(() => {
    if (!providerLocation) return requests

    return requests
      .map(req => {
        // Skip distance calculation if request has no location
        if (!req.latitude || !req.longitude) return null

        const distance = calculateDistance(
          providerLocation.latitude,
          providerLocation.longitude,
          req.latitude,
          req.longitude
        )

        // Filter to 10km radius
        if (distance > 10) return null

        return {
          ...req,
          distance_km: distance
        }
      })
      .filter((req): req is BookingWithDetails => req !== null)
      .sort((a, b) => (a.distance_km || 0) - (b.distance_km || 0))
  }, [requests, providerLocation])

  return (
    <DashboardLayout
      role="provider"
      pageTitle={t('pending_requests', 'Pending Requests')}
      pageSubtitle={t('review_provider_applications', 'New jobs from customers near you')}
    >
      <div className="max-w-5xl mx-auto">
        {loading ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center shadow-sm">
            <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-sm font-medium text-slate-600">{t('loading', 'Loading requests...')}</p>
          </div>
        ) : filteredRequests.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center shadow-sm space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center mx-auto text-slate-400">
              <ClipboardListIcon className="w-8 h-8" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 mb-1">{t('no_new_requests', 'No new service requests')}</h3>
              <p className="text-sm text-slate-500 max-w-md mx-auto">
                {t('you_will_be_notified', 'You will be notified when customers in your area request your service.')}
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredRequests.map((req) => (
              <div
                key={req.id}
                className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="flex flex-col lg:flex-row gap-6">
                  <div className="hidden lg:flex w-14 h-14 rounded-xl bg-blue-50 items-center justify-center flex-shrink-0">
                    <BoltIcon className="w-7 h-7 text-blue-600" />
                  </div>

                  <div className="flex-1 space-y-4">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h3 className="text-lg font-bold text-slate-900 mb-1">
                          {req.service?.name || t('service_request', 'Service Request')}
                        </h3>
                        <div className="flex items-center gap-3 text-sm text-slate-500 font-medium">
                          <span className="flex items-center gap-1.5 bg-slate-100 px-2 py-1 rounded-md">
                            <ClockIcon className="w-4 h-4" />
                            {req.scheduled_at
                              ? new Date(req.scheduled_at).toLocaleString('en-IN', {
                                  month: 'short',
                                  day: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })
                              : 'ASAP'}
                          </span>
                          {req.distance_km && (
                            <span className="flex items-center gap-1.5">
                              <LocationIcon className="w-4 h-4" /> {req.distance_km.toFixed(1)} km away
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-2xl font-bold text-blue-600" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
                          ₹{req.amount || 0}
                        </p>
                        <p className="text-xs text-slate-500 font-medium">{t('amount', 'Amount')}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100">
                      {req.customer?.avatar_url ? (
                        <img
                          src={req.customer.avatar_url}
                          alt=""
                          className="w-10 h-10 rounded-full object-cover border-2 border-white shadow-sm"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white text-sm font-bold">
                          {req.customer?.full_name?.charAt(0) || 'C'}
                        </div>
                      )}
                      <div>
                        <p className="text-sm font-bold text-slate-900">
                          {req.customer?.full_name || t('customer', 'Customer')}
                        </p>
                        {req.customer?.phone && (
                          <p className="text-xs text-slate-500 font-medium">📞 {req.customer.phone}</p>
                        )}
                      </div>
                    </div>

                    {req.address && (
                      <div className="flex items-start gap-2 text-sm text-slate-700 bg-blue-50/50 p-3 rounded-lg border border-blue-100">
                        <LocationIcon className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
                        <span>{req.address}</span>
                      </div>
                    )}

                    {req.notes && (
                      <div className="text-sm text-slate-600 italic bg-amber-50 border border-amber-100 p-3 rounded-lg">
                        <span className="font-semibold not-italic text-amber-800">Problem: </span>"{req.notes}"
                      </div>
                    )}

                    <div className="flex gap-3 pt-2">
                      <button
                        onClick={() => handleAcceptRequest(req.id)}
                        className="flex-1 sm:flex-none px-6 py-3 rounded-xl text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-sm transition-colors"
                      >
                        ✓ Accept Job
                      </button>
                      <button
                        onClick={() => handleDeclineRequest(req.id)}
                        className="flex-1 sm:flex-none px-6 py-3 rounded-xl text-sm font-semibold border-2 border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors"
                      >
                        Decline
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}

export default ProviderRequests
