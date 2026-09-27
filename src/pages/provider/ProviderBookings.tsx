import { useState, useEffect } from 'react'
import { useAuth } from '@/context/AuthContext'
import { useTranslation } from 'react-i18next'
import DashboardLayout from '@/components/DashboardLayout'
import { supabase } from '@/lib/supabase'
import { updateBookingStatus, BookingWithDetails } from '@/lib/providers'
import type { BookingStatus } from '@/types/database'
import BookingChatModal from '@/components/BookingChatModal'
import {
  CalendarIcon, LocationIcon, CheckCircleIcon, ClockIcon,
  PhoneIcon, ChatBubbleIcon, ExternalLinkIcon,
} from '@/components/Icons'

const ProviderBookings = () => {
  const { user } = useAuth()
  const { t } = useTranslation()
  const [loading, setLoading] = useState(true)
  const [bookings, setBookings] = useState<BookingWithDetails[]>([])
  const [filter, setFilter] = useState<'all' | 'confirmed' | 'in_progress' | 'completed'>('all')
  const [providerId, setProviderId] = useState<string | null>(null)
  const [chatBooking, setChatBooking] = useState<BookingWithDetails | null>(null)

  const loadData = async () => {
    if (!user?.id) return

    try {
      setLoading(true)

      // Get provider ID
      const { data: provider } = await supabase
        .from('service_providers')
        .select('id')
        .eq('user_id', user.id)
        .single()

      if (!provider) {
        setLoading(false)
        return
      }

      setProviderId(provider.id)

      // Fetch bookings
      const { data: bookingsData, error } = await supabase
        .from('bookings')
        .select('*, customer:users(full_name, avatar_url, phone), service:services(name)')
        .eq('provider_id', provider.id)
        .in('status', ['confirmed', 'in_progress', 'completed'])
        .order('scheduled_at', { ascending: false })

      if (error) throw error

      setBookings(bookingsData || [])
    } catch (err) {
      console.error('Failed to load bookings:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [user?.id])

  // Real-time subscription
  useEffect(() => {
    if (!providerId) return

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

    return () => {
      supabase.removeChannel(channel)
    }
  }, [providerId])

  const handleUpdateStatus = async (bookingId: string, status: BookingStatus) => {
    try {
      await updateBookingStatus(bookingId, status)
      await loadData()
    } catch (err) {
      console.error('Failed to update status:', err)
      alert("Failed to update status. Please try again.")
    }
  }

  const filteredBookings = filter === 'all'
    ? bookings
    : bookings.filter(b => b.status === filter)

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed':
        return { bg: 'var(--color-primary-tint)', border: 'var(--color-border)', text: 'var(--color-primary)', label: 'Confirmed' }
      case 'in_progress':
        return { bg: 'var(--color-primary-tint)', border: 'var(--color-border)', text: 'var(--color-primary)' , label: 'In Progress' }
      case 'completed':
        return { bg: '#f0fdf4', border: '#dcfce7', text: '#166534', label: 'Completed' }
      default:
        return { bg: '#f3f4f6', border: '#e5e7eb', text: '#374151', label: status }
    }
  }

  return (
    <DashboardLayout
      role="provider"
      pageTitle={t('my_bookings', 'My Bookings')}
      pageSubtitle={t('track_service_requests', 'Track your active jobs and bookings')}
    >
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Filter buttons */}
        <div className="flex gap-2 flex-wrap">
          {['all', 'confirmed', 'in_progress', 'completed'].map(status => (
            <button
              key={status}
              onClick={() => setFilter(status as any)}
              className="px-4 py-2 rounded-lg text-sm font-semibold transition-all"
              style={{
                backgroundColor: filter === status ? 'var(--color-primary)' : '#e8e4df',
                color: filter === status ? 'white' : '#57534e',
              }}
            >
              {status === 'all' ? 'All' : status === 'confirmed' ? 'Confirmed' : status === 'in_progress' ? 'In Progress' : 'Completed'}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center shadow-sm">
            <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-sm font-medium text-slate-600">{t('loading', 'Loading your bookings...')}</p>
          </div>
        ) : filteredBookings.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center shadow-sm space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center mx-auto text-slate-400">
              <CalendarIcon className="w-8 h-8" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 mb-1">
                {filter === 'all' ? t('no_active_jobs', 'No bookings yet') : `No ${filter} bookings`}
              </h3>
              <p className="text-sm text-slate-500">
                {filter === 'all'
                  ? t('you_will_be_notified', 'You will be notified when customers book your services.')
                  : `No bookings found with ${filter} status`}
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredBookings.map((booking) => {
              const statusInfo = getStatusColor(booking.status)
              return (
                <div
                  key={booking.id}
                  className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm hover:shadow-md transition-shadow"
                >
                  <div className="flex flex-col lg:flex-row gap-6">
                    <div className="flex-1 space-y-4">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <h3 className="text-lg font-bold text-slate-900 mb-2">
                            {booking.service?.name || t('service', 'Service')}
                          </h3>
                          <div
                            className="inline-flex px-3 py-1 rounded-lg text-sm font-bold border"
                            style={{
                              backgroundColor: statusInfo.bg,
                              borderColor: statusInfo.border,
                              color: statusInfo.text,
                            }}
                          >
                            {statusInfo.label}
                          </div>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className="text-2xl font-bold text-teal-600" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
                            ₹{booking.amount || 0}
                          </p>
                        </div>
                      </div>

                      {/* Customer info with contact actions */}
                      <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-3">
                        <div className="flex items-center gap-3">
                          {booking.customer?.avatar_url ? (
                            <img
                              src={booking.customer.avatar_url}
                              alt=""
                              className="w-10 h-10 rounded-full object-cover border-2 border-white shadow-sm"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-full bg-teal-600 flex items-center justify-center text-white text-sm font-bold">
                              {booking.customer?.full_name?.charAt(0) || 'C'}
                            </div>
                          )}
                          <div className="flex-1">
                            <p className="text-sm font-bold text-slate-900">
                              {booking.customer?.full_name || t('customer', 'Customer')}
                            </p>
                            {booking.customer?.phone && (
                              <p className="text-xs text-slate-500 font-medium">
                                📞 {booking.customer.phone}
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Contact & Chat buttons — visible for accepted bookings */}
                        {(booking.status === 'confirmed' || booking.status === 'in_progress') && (
                          <div className="flex gap-2 flex-wrap">
                            {booking.customer?.phone && (
                              <a
                                href={`tel:${booking.customer.phone}`}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-bold rounded-lg border border-emerald-200 transition-colors"
                              >
                                <PhoneIcon className="w-3.5 h-3.5" />
                                {t('call', 'Call')}
                              </a>
                            )}
                            <button
                              onClick={() => setChatBooking(booking)}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-bold rounded-lg border border-blue-200 transition-colors"
                            >
                              <ChatBubbleIcon className="w-3.5 h-3.5" />
                              {t('chat', 'Chat')}
                            </button>
                          </div>
                        )}
                      </div>

                      {/* Scheduled date & location */}
                      <div className="flex flex-col sm:flex-row gap-2 text-sm text-slate-600">
                        <div className="flex items-center gap-2 bg-slate-50 px-3 py-2 rounded-lg border border-slate-100">
                          <CalendarIcon className="w-4 h-4 text-slate-400" />
                          {booking.scheduled_at
                            ? new Date(booking.scheduled_at).toLocaleString('en-IN', {
                                month: 'short',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                              })
                            : 'ASAP'}
                        </div>
                      </div>

                      {/* Address with Google Maps link */}
                      {(booking.address || (booking.latitude && booking.longitude)) && (
                        <div className="flex items-start gap-2 text-sm text-slate-700 bg-slate-50 p-3 rounded-lg border border-slate-100">
                          <LocationIcon className="w-4 h-4 text-slate-400 flex-shrink-0 mt-0.5" />
                          <div className="flex-1">
                            {booking.address && <span>{booking.address}</span>}
                            {(booking.status === 'confirmed' || booking.status === 'in_progress') && (
                              <div className={booking.address ? 'mt-2' : ''}>
                                <a
                                  href={
                                    booking.latitude && booking.longitude
                                      ? `https://maps.google.com/?q=${booking.latitude},${booking.longitude}`
                                      : booking.address
                                        ? `https://maps.google.com/?q=${encodeURIComponent(booking.address)}`
                                        : '#'
                                  }
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-700 text-xs font-bold rounded-lg border border-red-200 transition-colors"
                                >
                                  <ExternalLinkIcon className="w-3.5 h-3.5" />
                                  {t('open_in_google_maps', 'Open in Google Maps')}
                                </a>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {booking.notes && (
                        <div className="text-sm text-slate-600 italic bg-amber-50 border border-amber-100 p-3 rounded-lg">
                          <span className="font-semibold not-italic text-amber-800">Note: </span>"{booking.notes}"
                        </div>
                      )}

                      {/* Action buttons */}
                      <div className="flex gap-3 pt-2">
                        {booking.status === 'confirmed' && (
                          <button
                            onClick={() => handleUpdateStatus(booking.id, 'in_progress')}
                            className="flex-1 sm:flex-none px-6 py-3 rounded-xl text-sm font-bold text-white bg-orange-500 hover:bg-orange-600 shadow-sm transition-colors"
                          >
                            Start Job
                          </button>
                        )}
                        {booking.status === 'in_progress' && (
                          <button
                            onClick={() => handleUpdateStatus(booking.id, 'completed')}
                            className="flex-1 sm:flex-none px-6 py-3 rounded-xl text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 shadow-sm transition-colors"
                          >
                            Mark Complete
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Chat Modal */}
      {chatBooking && (
        <BookingChatModal
          bookingId={chatBooking.id}
          recipientName={chatBooking.customer?.full_name || 'Customer'}
          onClose={() => setChatBooking(null)}
        />
      )}
    </DashboardLayout>
  )
}

export default ProviderBookings
