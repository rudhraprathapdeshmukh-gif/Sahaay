import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '@/context/AuthContext'
import DashboardLayout from '@/components/DashboardLayout'
import {
  CheckCircleIcon, BellIcon, CalendarIcon, UserIcon, ArrowRightIcon, WrenchIcon, TrashIcon, SearchIcon
} from '@/components/Icons'
import { supabase } from '@/lib/supabase'
import { fetchCustomerBookings, submitReview, checkIfReviewed, deleteBooking } from '@/lib/bookings'
import type { Booking } from '@/types/database'

interface BookingWithDetails extends Booking {
  provider?: {
    id: string
    user?: {
      full_name: string
      avatar_url: string | null
      phone: string | null
    }
    service?: {
      name: string
    }
  }
  reviews?: { id: string; rating: number; comment: string | null }[]
}

const CustomerDashboard = () => {
  const { t } = useTranslation()
  const { user } = useAuth()
  const [bookings, setBookings] = useState<BookingWithDetails[]>([])
  const [totalBookings, setTotalBookings] = useState(0)
  const [completedBookings, setCompletedBookings] = useState(0)
  const [loading, setLoading] = useState(true)

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
        setTotalBookings(data.length)
        setCompletedBookings(data.filter((b: any) => b.status === 'completed').length)
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

  useEffect(() => {
    if (!user?.id) return

    const channel = supabase
      .channel(`customer-bookings-${user.id}`)
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

  const getServiceName = (serviceId: number, booking: BookingWithDetails): string => {
    return booking.provider?.service?.name || t('service', 'Service')
  }

  const formatDate = (dateString: string | null): string => {
    if (!dateString) return t('not_set', 'Not scheduled')
    const date = new Date(dateString)
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
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
      default:
        return 'var(--color-primary)'
    }
  }

  return (
    <DashboardLayout
      role="customer"
      pageTitle={t('welcome_back_dashboard', 'Welcome back!')}
      pageSubtitle={t('manage_bookings_profile', 'Manage your bookings and profile.')}
    >
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* ── Left col (Main Content) ── */}
        <div className="lg:col-span-2 space-y-6">

          {/* Requested Services Section */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
            <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-100">
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <SearchIcon className="w-5 h-5 text-blue-600" /> {t('requested_services', 'Requested Services')}
              </h2>
              <Link to="/bookings" className="text-xs font-semibold text-blue-600 hover:text-blue-700 hover:underline">
                {t('view_all_bookings', 'View all bookings')}
              </Link>
            </div>

            {loading ? (
              <div className="py-12 text-center">
                <div className="w-6 h-6 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                <p className="text-sm text-slate-500 font-medium">{t('loading', 'Loading...')}</p>
              </div>
            ) : bookings.filter(b => b.status === 'broadcast').length === 0 ? (
              <div className="py-12 text-center max-w-sm mx-auto">
                <div className="w-16 h-16 rounded-full bg-slate-50 border border-slate-100 flex items-center justify-center mx-auto mb-4">
                  <SearchIcon className="w-7 h-7 text-slate-400" />
                </div>
                <h3 className="text-base font-bold text-slate-900 mb-1">{t('no_pending_requests', 'No pending requests')}</h3>
                <p className="text-sm text-slate-500 mb-6">
                  {t('submit_service_request', 'Submit a service request and let verified providers come to you.')}
                </p>
                <Link
                  to="/request"
                  className="inline-flex items-center justify-center px-6 py-2.5 rounded-xl text-sm font-semibold text-white bg-blue-600 shadow-sm hover:bg-blue-700 transition-colors"
                >
                  {t('request_service_now', 'Request Service Now')}
                </Link>
              </div>
            ) : (
              <div className="space-y-4">
                {bookings.filter(b => b.status === 'broadcast').map((booking) => {
                  const hasReviewed = booking.reviews && booking.reviews.length > 0
                  return (
                    <div key={booking.id} className="p-4 rounded-xl border border-slate-100 bg-slate-50/50 hover:border-blue-100 hover:bg-blue-50/20 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
                      <div className="flex items-start gap-3">
                        <div className="relative mt-1">
                          <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
                            <SearchIcon className="w-4 h-4 text-blue-600 animate-pulse" />
                          </div>
                          <div className="absolute inset-0 bg-blue-200 rounded-lg animate-ping opacity-20" style={{ animationDuration: '2s' }}></div>
                        </div>
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-bold text-slate-900 text-sm">
                              {getServiceName(booking.service_id, booking)}
                            </h4>
                            <span
                              className="px-2 py-0.5 text-[10px] uppercase tracking-wider font-bold rounded-md bg-purple-50 text-purple-600 border border-purple-200 animate-pulse"
                            >
                              {t('searching_provider', 'Searching')}
                            </span>
                          </div>
                          <p className="text-xs text-slate-500 font-medium flex items-center gap-1.5">
                            <SearchIcon className="w-3 h-3 text-purple-500" />
                            <span className="animate-pulse">{t('finding_provider', 'Finding a provider for you...')}</span>
                          </p>
                          <p className="text-xs text-slate-400 mt-0.5">
                            {booking.address || 'Service location'}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center justify-between sm:flex-col sm:items-end gap-2">
                        <p className="text-xs font-semibold text-slate-600 flex items-center gap-1.5">
                          <CalendarIcon className="w-3.5 h-3.5 text-slate-400" />
                          {booking.scheduled_at ? formatDate(booking.scheduled_at) : t('asap', 'ASAP')}
                        </p>

                        {/* Delete button for broadcast requests */}
                        {booking.status === 'broadcast' && (
                          <button
                            onClick={() => handleDeleteRequest(booking.id)}
                            className="text-xs font-semibold text-red-600 hover:text-red-800 flex items-center gap-1 px-2 py-1 rounded-md border border-red-200 hover:bg-red-50 transition-colors"
                            title="Cancel this request"
                          >
                            <TrashIcon className="w-3.5 h-3.5" />
                            Cancel
                          </button>
                        )}

                        {/* Status indicator */}
                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-purple-600 bg-purple-50 px-2 py-1 rounded-md border border-purple-200 animate-pulse">
                          <SearchIcon className="w-3 h-3" />
                          {t('searching_for_provider', 'Searching...')}
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Recent Bookings Panel */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
            <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-100">
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <CalendarIcon className="w-5 h-5 text-blue-600" /> {t('my_recent_bookings', 'My Recent Bookings')}
              </h2>
              <Link to="/bookings" className="text-xs font-semibold text-blue-600 hover:text-blue-700 hover:underline">
                {t('view_all_bookings', 'View all bookings')}
              </Link>
            </div>

            {loading ? (
              <div className="py-12 text-center">
                <div className="w-6 h-6 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                <p className="text-sm text-slate-500 font-medium">{t('loading', 'Loading...')}</p>
              </div>
            ) : bookings.length === 0 ? (
              <div className="py-12 text-center max-w-sm mx-auto">
                <div className="w-16 h-16 rounded-full bg-slate-50 border border-slate-100 flex items-center justify-center mx-auto mb-4">
                  <CalendarIcon className="w-7 h-7 text-slate-400" />
                </div>
                <h3 className="text-base font-bold text-slate-900 mb-1">{t('no_bookings_yet', 'No bookings yet')}</h3>
                <p className="text-sm text-slate-500 mb-6">
                  {t('you_havent_booked', "You haven't booked any services yet. Submit a service request and let verified providers come to you.")}
                </p>
                <Link
                  to="/request"
                  className="inline-flex items-center justify-center px-6 py-2.5 rounded-xl text-sm font-semibold text-white bg-blue-600 shadow-sm hover:bg-blue-700 transition-colors"
                >
                  {t('request_service_now', 'Request Service Now')}
                </Link>
              </div>
            ) : (
              <div className="space-y-4">
                {bookings.map((booking) => {
                  const hasReviewed = booking.reviews && booking.reviews.length > 0
                  return (
                    <div key={booking.id} className="p-4 rounded-xl border border-slate-100 bg-slate-50/50 hover:border-blue-100 hover:bg-blue-50/20 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-3 mb-1">
                          <h4 className="font-bold text-slate-900 text-sm">
                            {getServiceName(booking.service_id, booking)}
                          </h4>
                          <span
                            className="px-2 py-0.5 text-[10px] uppercase tracking-wider font-bold rounded-md"
                            style={{
                              backgroundColor: `${getStatusColor(booking.status)}15`,
                              color: getStatusColor(booking.status),
                              border: `1px solid ${getStatusColor(booking.status)}30`
                            }}
                          >
                            {booking.status}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 font-medium">
                          {t('provider', 'Provider')}: <span className="text-slate-700 font-semibold">{booking.provider?.user?.full_name || 'Professional'}</span>
                        </p>
                        <p className="text-xs text-slate-400 mt-0.5">
                          {booking.address || 'Service location'}
                        </p>
                      </div>

                      <div className="flex items-center justify-between sm:flex-col sm:items-end gap-2">
                        <p className="text-xs font-semibold text-slate-600 flex items-center gap-1.5">
                          <CalendarIcon className="w-3.5 h-3.5 text-slate-400" />
                          {booking.scheduled_at ? formatDate(booking.scheduled_at) : t('asap', 'ASAP')}
                        </p>

                        {/* Delete button for pending/broadcast requests */}
                        {(booking.status === 'pending' || booking.status === 'broadcast') && (
                          <button
                            onClick={() => handleDeleteRequest(booking.id)}
                            className="text-xs font-semibold text-red-600 hover:text-red-800 flex items-center gap-1 px-2 py-1 rounded-md border border-red-200 hover:bg-red-50 transition-colors"
                            title="Delete this request"
                          >
                            <TrashIcon className="w-3.5 h-3.5" />
                            Delete
                          </button>
                        )}

                        {/* Rating option only shows if already reviewed - button removed from card */}
                        {hasReviewed && (
                          <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-md border border-emerald-200">
                            ✓ {t('reviewed_dashboard', 'Reviewed ({{rating}}★)', {rating: booking.reviews![0].rating})}
                          </span>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        {/* ── Right col (Sidebar Stats & Action) ── */}
        <div className="space-y-6">

          {/* Stats */}
          <div className="grid grid-cols-2 gap-4">
            {[
              { label: t('total_services', 'Total Services'), value: totalBookings.toString(), icon: CalendarIcon, color: 'blue' },
              { label: t('completed_label', 'Completed'), value: completedBookings.toString(), icon: CheckCircleIcon, color: 'emerald' },
            ].map((stat, i) => (
              <div key={stat.label} className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm text-center flex flex-col items-center">
                <div className={`w-10 h-10 rounded-xl mb-3 flex items-center justify-center bg-${stat.color}-50`}>
                  <stat.icon className={`w-5 h-5 text-${stat.color}-600`} />
                </div>
                <p className="text-2xl font-bold text-slate-900" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
                  {stat.value}
                </p>
                <p className="text-xs font-medium text-slate-500 mt-1">{stat.label}</p>
              </div>
            ))}
          </div>

          {/* Request Service CTA */}
          <div className="bg-gradient-to-br from-teal-600 to-teal-700 rounded-2xl p-6 shadow-lg text-white">
            <h2 className="text-base font-bold mb-2">Need a Service?</h2>
            <p className="text-sm text-teal-100 mb-4">
              Submit a request and let verified providers come to you.
            </p>
            <Link
              to="/request"
              className="block w-full py-3 bg-white text-teal-700 rounded-xl text-sm font-bold text-center hover:bg-teal-50 transition-colors shadow-md"
            >
              Request Service Now
            </Link>
          </div>

          {/* Quick Actions List */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
            <h2 className="text-sm font-bold text-slate-900 mb-4">{t('quick_actions', 'Quick Actions')}</h2>
            <div className="space-y-2.5">
              <Link
                to="/request"
                className="flex items-center justify-between p-3.5 rounded-xl border border-blue-200 bg-blue-50/50 hover:bg-blue-50 transition-all text-sm font-bold text-blue-700 group shadow-sm"
              >
                <span className="flex items-center gap-3">
                  <WrenchIcon className="w-4 h-4 text-blue-600" />
                  {t('request_service_now', 'Request Service Now')}
                </span>
                <ArrowRightIcon className="w-4 h-4 text-blue-500 group-hover:translate-x-0.5 transition-transform" />
              </Link>
              {[
                { label: t('booking_history', 'Booking History'), href: '/bookings', icon: CalendarIcon },
                { label: t('messages_alerts', 'Messages & Alerts'), href: '/notifications', icon: BellIcon },
                { label: t('account_settings', 'Account Settings'), href: '/profile', icon: UserIcon },
              ].map(action => (
                <Link
                  key={action.label}
                  to={action.href}
                  className="flex items-center justify-between p-3.5 rounded-xl border border-slate-100 hover:border-slate-300 hover:bg-slate-50 transition-all text-sm font-medium text-slate-700 group"
                >
                  <span className="flex items-center gap-3">
                    <action.icon className="w-4 h-4 text-slate-400 group-hover:text-blue-600 transition-colors" />
                    {action.label}
                  </span>
                  <ArrowRightIcon className="w-4 h-4 text-slate-300 group-hover:text-slate-500 group-hover:translate-x-0.5 transition-all" />
                </Link>
              ))}
            </div>
          </div>

        </div>
      </div>

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
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setReviewBooking(null)}
                  className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
                >
                  {t('cancel_review', 'Cancel Review')}
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
    </DashboardLayout>
  )
}

export default CustomerDashboard