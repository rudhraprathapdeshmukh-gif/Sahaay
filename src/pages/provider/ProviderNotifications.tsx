import { useState, useEffect } from 'react'
import { useAuth } from '@/context/AuthContext'
import { useTranslation } from 'react-i18next'
import DashboardLayout from '@/components/DashboardLayout'
import { supabase } from '@/lib/supabase'
import { BellIcon, CalendarIcon, CheckCircleIcon, BoltIcon, ChatBubbleIcon } from '@/components/Icons'

interface Notification {
  id: string
  type: 'booking' | 'message' | 'review' | 'system'
  title: string
  description: string
  timestamp: string
  read: boolean
  booking_id?: string
  customer_name?: string
  amount?: number
}

const ProviderNotifications = () => {
  const { user } = useAuth()
  const { t } = useTranslation()
  const [loading, setLoading] = useState(true)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [filter, setFilter] = useState<'all' | 'unread'>('all')

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

      // Fetch notifications from multiple sources
      const notificationsData: Notification[] = []

      // 1. Get recent bookings
      const { data: bookings } = await supabase
        .from('bookings')
        .select('id, status, customer:users(full_name), amount, created_at')
        .eq('provider_id', provider.id)
        .order('created_at', { ascending: false })
        .limit(10)

      // Add booking notifications
      bookings?.forEach((booking: any) => {
        if (booking.status === 'pending') {
          notificationsData.push({
            id: booking.id,
            type: 'booking',
            title: 'New Service Request',
            description: `${booking.customer?.full_name || 'Customer'} requested your service`,
            timestamp: booking.created_at,
            read: false,
            booking_id: booking.id,
            customer_name: booking.customer?.full_name,
            amount: booking.amount,
          })
        } else if (booking.status === 'confirmed') {
          notificationsData.push({
            id: booking.id,
            type: 'booking',
            title: 'Booking Accepted',
            description: `You accepted a request from ${booking.customer?.full_name || 'Customer'}`,
            timestamp: booking.created_at,
            read: true,
            booking_id: booking.id,
            customer_name: booking.customer?.full_name,
          })
        } else if (booking.status === 'completed') {
          notificationsData.push({
            id: booking.id,
            type: 'booking',
            title: 'Job Completed',
            description: `Service for ${booking.customer?.full_name || 'Customer'} marked complete`,
            timestamp: booking.created_at,
            read: true,
            booking_id: booking.id,
            customer_name: booking.customer?.full_name,
          })
        }
      })

      // 2. Get reviews
      const { data: reviews } = await supabase
        .from('reviews')
        .select('id, rating, customer:users(full_name), created_at')
        .eq('provider_id', provider.id)
        .order('created_at', { ascending: false })
        .limit(5)

      // Add review notifications
      reviews?.forEach((review: any) => {
        notificationsData.push({
          id: review.id,
          type: 'review',
          title: 'New Review',
          description: `${review.customer?.full_name || 'Customer'} gave you a ${review.rating}★ rating`,
          timestamp: review.created_at,
          read: true,
        })
      })

      // Sort by timestamp
      notificationsData.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      setNotifications(notificationsData)
    } catch (err) {
      console.error('Failed to load notifications:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [user?.id])

  // Real-time subscription for new bookings
  useEffect(() => {
    if (!user?.id) return

    const channel = supabase
      .channel(`provider-notifications-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'bookings',
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

  const markAsRead = (id: string) => {
    setNotifications(notifications.map(notif =>
      notif.id === id ? { ...notif, read: true } : notif
    ))
  }

  const markAllAsRead = () => {
    setNotifications(notifications.map(notif => ({ ...notif, read: true })))
  }

  const getNotificationIcon = (type: Notification['type']) => {
    switch (type) {
      case 'booking':
        return <CalendarIcon className="w-5 h-5 text-blue-600" />
      case 'message':
        return <ChatBubbleIcon className="w-5 h-5 text-green-600" />
      case 'review':
        return <CheckCircleIcon className="w-5 h-5 text-amber-600" />
      case 'system':
        return <BellIcon className="w-5 h-5 text-purple-600" />
      default:
        return <BoltIcon className="w-5 h-5 text-slate-600" />
    }
  }

  const getNotificationColor = (type: Notification['type']) => {
    switch (type) {
      case 'booking':
        return 'bg-blue-50 border-blue-100'
      case 'message':
        return 'bg-green-50 border-green-100'
      case 'review':
        return 'bg-amber-50 border-amber-100'
      case 'system':
        return 'bg-purple-50 border-purple-100'
      default:
        return 'bg-slate-50 border-slate-100'
    }
  }

  const filteredNotifications = filter === 'unread'
    ? notifications.filter(notif => !notif.read)
    : notifications

  const unreadCount = notifications.filter(notif => !notif.read).length

  return (
    <DashboardLayout
      role="provider"
      pageTitle={t('messages_alerts', 'Messages & Alerts')}
      pageSubtitle={t('stay_updated_on_jobs_and_customers', 'Stay updated on new jobs, customer messages, and platform updates')}
    >
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header with stats */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-900">{t('notifications', 'Notifications')}</h2>
            <p className="text-sm text-slate-500 mt-1">
              {unreadCount === 0
                ? t('all_caught_up', "You're all caught up!")
                : `${unreadCount} unread notification${unreadCount !== 1 ? 's' : ''}`}
            </p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => setFilter(filter === 'all' ? 'unread' : 'all')}
              className="px-4 py-2 rounded-lg text-sm font-semibold transition-all border"
              style={{
                backgroundColor: filter === 'unread' ? 'var(--color-primary)' : 'white',
                borderColor: filter === 'unread' ? 'var(--color-primary)' : '#e8e4df',
                color: filter === 'unread' ? 'white' : '#57534e',
              }}
            >
              {filter === 'all' ? 'Show Unread' : 'Show All'}
            </button>
            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                className="px-4 py-2 rounded-lg text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 transition-colors"
              >
                Mark All Read
              </button>
            )}
          </div>
        </div>

        {loading ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center shadow-sm">
            <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-sm font-medium text-slate-600">{t('loading', 'Loading notifications...')}</p>
          </div>
        ) : filteredNotifications.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center shadow-sm space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center mx-auto text-slate-400">
              <BellIcon className="w-8 h-8" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 mb-1">
                {filter === 'unread' ? t('no_unread_notifications', 'No unread notifications') : t('no_notifications', 'No notifications yet')}
              </h3>
              <p className="text-sm text-slate-500">
                {filter === 'unread'
                  ? 'All your notifications are marked as read.'
                  : 'You will receive notifications about new jobs, messages, and reviews here.'}
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredNotifications.map((notification) => (
              <div
                key={notification.id}
                className={`bg-white rounded-2xl border p-5 shadow-sm transition-all hover:shadow-md ${getNotificationColor(
                  notification.type
                )}`}
              >
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0">
                    <div
                      className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                        !notification.read ? 'bg-blue-50 ring-2 ring-blue-100' : ''
                      }`}
                    >
                      {getNotificationIcon(notification.type)}
                      {!notification.read && (
                        <div className="absolute -top-1 -right-1 w-3 h-3 bg-blue-600 rounded-full border-2 border-white" />
                      )}
                    </div>
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <h4 className="font-bold text-slate-900 text-base">{notification.title}</h4>
                      <span className="text-xs text-slate-500 whitespace-nowrap">
                        {new Date(notification.timestamp).toLocaleDateString('en-IN', {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>

                    <p className="text-sm text-slate-600 mb-2">{notification.description}</p>

                    {notification.amount && (
                      <span className="inline-block px-2 py-1 text-xs font-bold text-blue-600 bg-blue-50 rounded-md border border-blue-100">
                        ₹{notification.amount}
                      </span>
                    )}

                    {notification.customer_name && (
                      <div className="flex items-center gap-2 mt-2 text-xs text-slate-500">
                        <span className="font-semibold">Customer:</span>
                        {notification.customer_name}
                      </div>
                    )}
                  </div>

                  {!notification.read && (
                    <button
                      onClick={() => markAsRead(notification.id)}
                      className="text-xs font-semibold text-blue-600 hover:text-blue-700 whitespace-nowrap"
                    >
                      Mark as read
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Info Box */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm text-blue-700">
          <strong>💡 Tip:</strong> Notifications appear for new service requests, completed jobs, customer messages, reviews, and important platform updates. They are stored only in your browser for this session.
        </div>
      </div>
    </DashboardLayout>
  )
}

export default ProviderNotifications
