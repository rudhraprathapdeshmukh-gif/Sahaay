import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '@/context/AuthContext'
import DashboardLayout from '@/components/DashboardLayout'
import { CalendarIcon, LocationIcon, StarIcon, ClockIcon, TrashIcon, ChatBubbleIcon, PhoneIcon } from '@/components/Icons'
import { supabase } from '@/lib/supabase'
import { fetchCustomerBookings, submitReview, checkIfReviewed, deleteBooking } from '@/lib/bookings'
import type { Booking } from '@/types/database'
import BookingChatModal from '@/components/BookingChatModal'

interface BookingWithDetails extends Booking {
  provider?: {
    id: string
    user?: {
      full_name: string
      avatar_url: string | null
      phone: string | null
      city: string | null
    }
    service?: {
      name: string
    }
    rating?: number
    profile_photo_url?: string | null
  }
  reviews?: { id: string; rating: number; comment: string | null }[]
}

const CustomerBookingsPage = () => {
  const { t } = useTranslation()
  const { user } = useAuth()
  const [bookings, setBookings] = useState<BookingWithDetails[]>([])
  const [loading, setLoading] = useState(true)

  // Review modal state
  const [reviewBooking, setReviewBooking] = useState<BookingWithDetails | null>(null)
  const [rating, setRating] = useState(5)
  const [comment, setComment] = useState('')
  const [submittingReview, setSubmittingReview] = useState(false)

  // Delete confirmation state
  const [deletingBooking, setDeletingBooking] = useState<string | null>(null)

  // Chat modal state
  const [chatBooking, setChatBooking] = useState<BookingWithDetails | null>(null)

  // Track completed bookings we've already prompted for review
  const promptedBookings = useRef<Set<string>>(new Set())

  // Live request statuses - excludes completed and cancelled
  const LIVE_STATUSES = ['pending', 'broadcast', 'confirmed', 'in_progress']

  const loadData = async () => {
    if (!user?.id) {
      setLoading(false)
      return
    }

    try {
      const data = await fetchCustomerBookings(user.id)
      if (data) {
        // Filter to show only live/active requests
        const liveBookings = data.filter(booking => LIVE_STATUSES.includes(booking.status))
        setBookings(liveBookings)
      }
    } catch (err) {
      console.warn('Error fetching customer bookings:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [user?.id])

  // Real-time subscription for booking updates
  useEffect(() => {
    if (!user?.id) return

    const channel = supabase
      .channel(`customer-bookings-all-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'bookings',
          filter: `customer_id=eq.${user.id}`,
        },
        (payload) => {
          // Only reload if it's an INSERT or UPDATE, not DELETE
          if (payload.eventType !== 'DELETE') {
            loadData()
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [user?.id])

  // Check for newly completed bookings and show rating popup
  useEffect(() => {
    if (!bookings.length || !user?.id) return

    const checkForCompletedBookings = async () => {
      for (const booking of bookings) {
        if (
          booking.status === 'completed' &&
          !promptedBookings.current.has(booking.id)
        ) {
          // Check if already reviewed
          const hasReviewed = await checkIfReviewed(booking.id)
          if (!hasReviewed) {
            promptedBookings.current.add(booking.id)
            setReviewBooking(booking)
            break // Show one at a time
          }
        }
      }
    }

    checkForCompletedBookings()
  }, [bookings, user?.id])

  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user?.id || !reviewBooking) return

    setSubmittingReview(true)
    try {
      await submitReview({
        booking_id: reviewBooking.id,
        customer_id: user.id,
        provider_id: reviewBooking.provider_id,
        rating,
        comment,
      })
      alert(t('review_submitted', 'Review submitted successfully!'))
      setReviewBooking(null)
      setRating(5)
      setComment('')
      await loadData()
    } catch (err) {
      console.error('Failed to submit review:', err)
      alert(t('review_failed', 'Failed to submit review. You may have already reviewed this booking.'))
    } finally {
      setSubmittingReview(false)
    }
  }

  const handleDeleteRequest = async (bookingId: string) => {
    if (!confirm('Are you sure you want to delete this request? This action cannot be undone.')) {
      return
    }

    // Optimistically remove the booking from UI immediately
    setBookings(prev => prev.filter(booking => booking.id !== bookingId))

    try {
      await deleteBooking(bookingId)
      // Wait briefly for database propagation, then force reload
      await new Promise(resolve => setTimeout(resolve, 500))
      await loadData()
    } catch (err) {
      console.error('Failed to delete request:', err)
      alert('Failed to delete request. Please try again.')
      // Reload data to restore accurate state if delete failed
      await loadData()
    }
  }

  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'completed':
        return '#10b981'
      case 'confirmed':
        return 'var(--color-primary)'
      case 'in_progress':
        return '#f59e0b'
      case 'cancelled':
        return '#ef4444'
      case 'broadcast':
        return '#8b5cf6' // Purple for "searching for provider"
      case 'pending':
        return '#94a3b8'
      default:
        return '#64748b'
    }
  }

  return (
    <DashboardLayout
      role="customer"
      pageTitle={t('requests', 'Requests')}
      pageSubtitle={t('track_active_requests', 'Track your active service requests and ongoing jobs.')}
    >
      <div className="max-w-4xl mx-auto space-y-6">
        {loading ? (
          <div className="bg-white rounded-2xl border border-slate-200/80 p-12 text-center shadow-sm">
            <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-sm font-medium text-slate-600">{t('loading', 'Loading your bookings...')}</p>
          </div>
        ) : bookings.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200/80 p-12 text-center shadow-sm space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center mx-auto text-slate-400">
              <CalendarIcon className="w-8 h-8" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 mb-1">{t('no_active_requests', 'No active requests')}</h3>
              <p className="text-sm text-slate-500 max-w-sm mx-auto">
                {t('no_active_requests_desc', "You don't have any active service requests at the moment. Start by requesting a service!")}
              </p>
            </div>
            <Link
              to="/request"
              className="inline-flex items-center justify-center px-6 py-2.5 rounded-xl text-xs font-bold text-white bg-blue-600 shadow-sm hover:bg-blue-700 transition-colors"
            >
              {t('request_service_now', 'Request Service Now')}
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {bookings.map((booking) => {
              const hasReviewed = booking.reviews && booking.reviews.length > 0
              return (
                <div
                  key={booking.id}
                  className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm hover:shadow-md transition-shadow flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div className="space-y-1.5 flex-1">
                    <div className="flex items-center gap-3">
                      <h4 className="font-bold text-slate-900 text-base">
                        {booking.provider?.service?.name || t('service', 'Service Booking')}
                      </h4>
                      <span
                        className="px-2.5 py-0.5 text-[10px] uppercase tracking-wider font-extrabold rounded-md border"
                        style={{
                          backgroundColor: `${getStatusColor(booking.status)}10`,
                          color: getStatusColor(booking.status),
                          borderColor: `${getStatusColor(booking.status)}30`,
                        }}
                      >
                        {booking.status === 'confirmed' ? t('confirmed', 'Accepted') : t(booking.status, booking.status)}
                      </span>
                    </div>

                    {/* Provider info with photo OR unassigned notice */}
                    {booking.provider_id ? (
                      <>
                        <div className="flex items-center gap-3 mt-2">
                          <div className="w-8 h-8 rounded-lg overflow-hidden bg-blue-600 text-white font-bold flex items-center justify-center flex-shrink-0 text-sm">
                            {booking.provider?.profile_photo_url || booking.provider?.user?.avatar_url ? (
                              <img
                                src={booking.provider?.profile_photo_url || booking.provider?.user?.avatar_url!}
                                alt={booking.provider?.user?.full_name}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              booking.provider?.user?.full_name?.charAt(0) || 'P'
                            )}
                          </div>
                          <div>
                            <span className="text-xs text-slate-600 font-medium">
                              {t('provider', 'Provider')}: <strong className="text-slate-900">{booking.provider?.user?.full_name || 'Professional'}</strong>
                            </span>
                            <div className="flex items-center gap-2 text-xs text-slate-500">
                              {booking.provider?.rating && booking.provider.rating > 0 && (
                                <span className="flex items-center gap-1 text-amber-600">
                                  <StarIcon className="w-3 h-3 fill-current" />
                                  {booking.provider.rating.toFixed(1)}
                                </span>
                              )}
                              {booking.provider?.user?.city && (
                                <span className="flex items-center gap-1">
                                  <LocationIcon className="w-3 h-3" />
                                  {booking.provider.user.city}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {booking.provider?.user?.phone && (
                          <div className="text-xs text-slate-600 font-medium flex items-center gap-1.5">
                            📞 {booking.provider.user.phone}
                          </div>
                        )}

                        {/* Contact & Chat buttons - visible for accepted bookings */}
                        {(booking.status === 'confirmed' || booking.status === 'in_progress') && (
                          <div className="flex gap-2 mt-2">
                            {booking.provider?.user?.phone && (
                              <a
                                href={`tel:${booking.provider.user.phone}`}
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
                      </>
                    ) : (
                      <div className="mt-2 p-2.5 bg-purple-50 border border-purple-200 rounded-lg">
                        <p className="text-xs text-purple-700 font-medium">
                          🔍 Searching for available providers near you...
                        </p>
                      </div>
                    )}

                    {booking.address && (
                      <p className="text-xs text-slate-500 flex items-center gap-1.5">
                        <LocationIcon className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                        <span>{booking.address}</span>
                      </p>
                    )}

                    {booking.notes && (
                      <p className="text-xs text-slate-500 italic bg-slate-50 p-2 rounded-lg border border-slate-100 mt-1">
                        "{booking.notes}"
                      </p>
                    )}
                  </div>

                  <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-3 border-t sm:border-t-0 pt-3 sm:pt-0 border-slate-100 flex-shrink-0">
                    <div className="text-xs font-semibold text-slate-600 flex items-center gap-1.5">
                      <ClockIcon className="w-3.5 h-3.5 text-slate-400" />
                      {booking.scheduled_at ? new Date(booking.scheduled_at).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : t('asap', 'ASAP')}
                    </div>

                    {/* Rating option only shows if already reviewed - button removed from card */}
                    {hasReviewed && (
                      <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-200">
                        ✓ {t('reviewed_dashboard', 'Reviewed ({{rating}}★)', {rating: booking.reviews![0].rating})}
                      </span>
                    )}

                    {/* Delete button for pending/broadcast requests */}
                    {(booking.status === 'pending' || booking.status === 'broadcast') && (
                      <button
                        onClick={() => handleDeleteRequest(booking.id)}
                        className="text-xs font-semibold text-red-600 hover:text-red-800 flex items-center gap-1 px-3 py-1.5 rounded-xl border border-red-200 hover:bg-red-50 transition-colors"
                        title="Delete this request"
                      >
                        <TrashIcon className="w-3.5 h-3.5" />
                        Delete
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Chat Modal */}
        {chatBooking && chatBooking.provider?.user && (
          <BookingChatModal
            bookingId={chatBooking.id}
            recipientName={chatBooking.provider.user.full_name || 'Provider'}
            onClose={() => setChatBooking(null)}
          />
        )}

        {/* Review Modal */}
        {reviewBooking && (
          <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
            <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl relative animate-in zoom-in-95 duration-200">
              <button
                onClick={() => setReviewBooking(null)}
                className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-100"
              >
                ✕
              </button>

              {/* Provider Info in Modal */}
              <div className="flex items-center gap-3 mb-4 pb-4 border-b border-slate-100">
                <div className="w-12 h-12 rounded-xl overflow-hidden bg-blue-600 text-white font-bold flex items-center justify-center flex-shrink-0 text-lg">
                  {reviewBooking.provider?.profile_photo_url || reviewBooking.provider?.user?.avatar_url ? (
                    <img
                      src={reviewBooking.provider?.profile_photo_url || reviewBooking.provider?.user?.avatar_url!}
                      alt={reviewBooking.provider?.user?.full_name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    reviewBooking.provider?.user?.full_name?.charAt(0) || 'P'
                  )}
                </div>
                <div>
                  <p className="font-semibold text-slate-900">{reviewBooking.provider?.user?.full_name}</p>
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    {reviewBooking.provider?.rating && reviewBooking.provider.rating > 0 && (
                      <span className="flex items-center gap-1 text-amber-600">
                        <StarIcon className="w-3 h-3 fill-current" />
                        {reviewBooking.provider.rating.toFixed(1)}
                      </span>
                    )}
                    {reviewBooking.provider?.user?.city && (
                      <span className="flex items-center gap-1">
                        <LocationIcon className="w-3 h-3" />
                        {reviewBooking.provider.user.city}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <h2 className="text-xl font-bold text-slate-900 mb-1">{t('rate_your_experience', 'Rate Your Experience')}</h2>
              <p className="text-sm text-slate-500 mb-6">
                {t('how_was_your_service', 'How was your service with')} <span className="font-semibold text-slate-800">{reviewBooking.provider?.user?.full_name}</span>?
              </p>

              <form onSubmit={handleReviewSubmit} className="space-y-5">
                <div className="flex justify-center gap-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      type="button"
                      key={star}
                      onClick={() => setRating(star)}
                      className={`w-10 h-10 rounded-full flex items-center justify-center text-lg transition-transform hover:scale-110 ${
                        star <= rating ? 'bg-amber-100 text-amber-600 font-bold' : 'bg-slate-100 text-slate-400'
                      }`}
                    >
                      ★
                    </button>
                  ))}
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                    {t('comments_or_feedback', 'Comments or Feedback')}
                  </label>
                  <textarea
                    rows={3}
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    placeholder={t('share_details', 'Share details of your experience...')}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 resize-none"
                  />
                </div>

                <div className="flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setReviewBooking(null)}
                    className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
                  >
                    {t('cancel_review', 'Cancel')}
                  </button>
                  <button
                    type="submit"
                    disabled={submittingReview}
                    className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-sm transition-colors disabled:opacity-50"
                  >
                    {submittingReview ? t('submitting', 'Submitting...') : t('submit_review', 'Submit Review')}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}

export default CustomerBookingsPage