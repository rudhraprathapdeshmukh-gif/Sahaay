import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '@/context/AuthContext'
import DashboardLayout from '@/components/DashboardLayout'
import { CalendarIcon, LocationIcon, StarIcon, CheckCircleIcon, ClockIcon, ClipboardListIcon } from '@/components/Icons'
import { supabase } from '@/lib/supabase'
import { fetchCustomerBookings, submitReview, checkIfReviewed } from '@/lib/bookings'
import type { Booking } from '@/types/database'

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

const CustomerHistoryPage = () => {
  const { t } = useTranslation()
  const { user } = useAuth()
  const [bookings, setBookings] = useState<BookingWithDetails[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'pending' | 'completed' | 'cancelled'>('all')

  // Review modal state
  const [reviewBooking, setReviewBooking] = useState<BookingWithDetails | null>(null)
  const [rating, setRating] = useState(5)
  const [comment, setComment] = useState('')
  const [submittingReview, setSubmittingReview] = useState(false)

  const loadData = async () => {
    if (!user?.id) {
      setLoading(false)
      return
    }

    try {
      const data = await fetchCustomerBookings(user.id)
      if (data) {
        setBookings(data)
      }
    } catch (err) {
      console.warn('Error fetching customer history:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [user?.id])

  // Real-time subscription for booking updates (only INSERT/UPDATE, not DELETE)
  useEffect(() => {
    if (!user?.id) return

    const channel = supabase
      .channel(`customer-history-${user.id}`)
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
      case 'pending':
        return '#94a3b8'
      default:
        return '#64748b'
    }
  }

  const filteredBookings = filter === 'all'
    ? bookings
    : bookings.filter((b) => b.status === filter)

  return (
    <DashboardLayout
      role="customer"
      pageTitle={t('history', 'History')}
      pageSubtitle={t('view_all_past_requests', 'Review your complete service history, past requests, and receipts')}
    >
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Filter Tabs */}
        <div className="flex gap-2 flex-wrap">
          {[
            { label: 'All History', value: 'all' },
            { label: 'Pending', value: 'pending' },
            { label: 'Completed', value: 'completed' },
            { label: 'Cancelled', value: 'cancelled' },
          ].map((tab) => (
            <button
              key={tab.value}
              onClick={() => setFilter(tab.value as any)}
              className="px-4 py-2 rounded-xl text-xs font-bold transition-all"
              style={{
                backgroundColor: filter === tab.value ? 'var(--color-primary)' : '#e8e4df',
                color: filter === tab.value ? 'white' : '#57534e',
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="bg-white rounded-2xl border border-slate-200/80 p-12 text-center shadow-sm">
            <div className="w-8 h-8 border-3 border-teal-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-sm font-medium text-slate-600">{t('loading', 'Loading history...')}</p>
          </div>
        ) : filteredBookings.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200/80 p-12 text-center shadow-sm space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center mx-auto text-slate-400">
              <ClipboardListIcon className="w-8 h-8" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 mb-1">{t('no_history_records', 'No records found')}</h3>
              <p className="text-sm text-slate-500 max-w-sm mx-auto">
                No past booking requests match the selected filter.
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredBookings.map((booking) => {
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
                        {booking.status}
                      </span>
                    </div>

                    {/* Provider info with photo */}
                    <div className="flex items-center gap-3 mt-2">
                      <div className="w-8 h-8 rounded-lg overflow-hidden bg-teal-600 text-white font-bold flex items-center justify-center flex-shrink-0 text-sm">
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
                    <div className="text-right">
                      <p className="text-lg font-bold text-slate-900">₹{booking.amount || 0}</p>
                      <div className="text-xs font-semibold text-slate-500 flex items-center gap-1 mt-0.5">
                        <ClockIcon className="w-3 h-3 text-slate-400" />
                        {booking.scheduled_at ? new Date(booking.scheduled_at).toLocaleDateString() : t('asap', 'ASAP')}
                      </div>
                    </div>

                    {/* Rating option only shows if already reviewed - button removed from card */}
                    {hasReviewed && (
                      <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
                        ✓ {t('reviewed_dashboard', 'Reviewed ({{rating}}★)', {rating: booking.reviews![0].rating})}
                      </span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Review Modal */}
        {reviewBooking && (
          <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl relative animate-in fade-in zoom-in-95 duration-200">
              <button
                onClick={() => setReviewBooking(null)}
                className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-100"
              >
                ✕
              </button>

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
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600 resize-none"
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
                    className="px-5 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold shadow-sm transition-colors disabled:opacity-50"
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

export default CustomerHistoryPage
