import { useState, useEffect } from 'react'
import { BellIcon, CalendarIcon, CheckCircleIcon, XMarkIcon } from './Icons'
import { supabase } from '@/lib/supabase'

interface Notification {
  id: string
  type: 'booking' | 'review'
  title: string
  description: string
  timestamp: string
  read: boolean
  booking_id?: string
}

interface NotificationPanelProps {
  isOpen: boolean
  onClose: () => void
  userRole: 'customer' | 'provider'
  userId: string
}

const NotificationPanel = ({ isOpen, onClose, userRole, userId }: NotificationPanelProps) => {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'unread'>('all')

  const loadNotifications = async () => {
    if (!userId) return
    try {
      setLoading(true)

      const items: Notification[] = []

      if (userRole === 'customer') {
        const { data: bookings } = await supabase
          .from('bookings')
          .select('id, status, provider:service_providers(user:users(full_name)), created_at')
          .eq('customer_id', userId)
          .order('created_at', { ascending: false })
          .limit(10)

        bookings?.forEach((booking: any) => {
          const providerName = booking.provider?.user?.full_name || 'Provider'
          if (booking.status === 'pending') {
            items.push({
              id: booking.id,
              type: 'booking',
              title: 'Service Request Sent',
              description: `Your request to ${providerName} is pending confirmation`,
              timestamp: booking.created_at,
              read: true,
              booking_id: booking.id,
            })
          } else if (booking.status === 'confirmed') {
            items.push({
              id: booking.id,
              type: 'booking',
              title: 'Booking Confirmed',
              description: `${providerName} has accepted your service request`,
              timestamp: booking.created_at,
              read: false,
              booking_id: booking.id,
            })
          } else if (booking.status === 'in_progress') {
            items.push({
              id: booking.id,
              type: 'booking',
              title: 'Service Started',
              description: `${providerName} has started your service`,
              timestamp: booking.created_at,
              read: false,
              booking_id: booking.id,
            })
          } else if (booking.status === 'completed') {
            items.push({
              id: booking.id,
              type: 'booking',
              title: 'Service Completed',
              description: `${providerName} has completed your service`,
              timestamp: booking.created_at,
              read: true,
              booking_id: booking.id,
            })
          }
        })
      } else {
        // Provider: look up their service_providers.id first
        const { data: provider } = await supabase
          .from('service_providers')
          .select('id')
          .eq('user_id', userId)
          .single()

        if (provider) {
          const { data: bookings } = await supabase
            .from('bookings')
            .select('id, status, customer:users(full_name), created_at')
            .eq('provider_id', provider.id)
            .order('created_at', { ascending: false })
            .limit(10)

          bookings?.forEach((booking: any) => {
            const customerName = booking.customer?.full_name || 'Customer'
            if (booking.status === 'pending') {
              items.push({
                id: booking.id,
                type: 'booking',
                title: 'New Service Request',
                description: `${customerName} requested your service`,
                timestamp: booking.created_at,
                read: false,
                booking_id: booking.id,
              })
            } else if (booking.status === 'confirmed') {
              items.push({
                id: booking.id,
                type: 'booking',
                title: 'Booking Accepted',
                description: `You accepted a request from ${customerName}`,
                timestamp: booking.created_at,
                read: true,
                booking_id: booking.id,
              })
            } else if (booking.status === 'completed') {
              items.push({
                id: booking.id,
                type: 'booking',
                title: 'Job Completed',
                description: `Service for ${customerName} marked complete`,
                timestamp: booking.created_at,
                read: true,
                booking_id: booking.id,
              })
            }
          })

          // Reviews for provider
          const { data: reviews } = await supabase
            .from('reviews')
            .select('id, rating, customer:users(full_name), created_at')
            .eq('provider_id', provider.id)
            .order('created_at', { ascending: false })
            .limit(5)

          reviews?.forEach((review: any) => {
            items.push({
              id: review.id,
              type: 'review',
              title: 'New Review',
              description: `${review.customer?.full_name || 'Customer'} gave you a ${review.rating}★ rating`,
              timestamp: review.created_at,
              read: true,
            })
          })
        }
      }

      items.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      setNotifications(items)
    } catch (error) {
      console.error('Failed to load notifications:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (isOpen && userId) {
      loadNotifications()
    }
  }, [isOpen, userId, userRole])

  // Realtime: when a booking is inserted/updated the provider/customer sees it instantly
  useEffect(() => {
    if (!userId) return

    let channel: ReturnType<typeof supabase.channel> | null = null

    const setup = async () => {
      if (userRole === 'customer') {
        channel = supabase
          .channel(`panel-customer-bookings-${userId}`)
          .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'bookings', filter: `customer_id=eq.${userId}` },
            () => { if (isOpen) loadNotifications() }
          )
          .subscribe()
      } else {
        const { data: provider } = await supabase
          .from('service_providers')
          .select('id')
          .eq('user_id', userId)
          .single()

        if (!provider) return

        channel = supabase
          .channel(`panel-provider-bookings-${provider.id}`)
          .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'bookings', filter: `provider_id=eq.${provider.id}` },
            () => { if (isOpen) loadNotifications() }
          )
          .subscribe()
      }
    }

    setup()
    return () => {
      if (channel) supabase.removeChannel(channel)
    }
  }, [userId, userRole, isOpen])

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
        return <CalendarIcon className="w-4 h-4 text-blue-600" />
      case 'review':
        return <CheckCircleIcon className="w-4 h-4 text-amber-600" />
      default:
        return <BellIcon className="w-4 h-4 text-slate-600" />
    }
  }

  const getNotificationColor = (type: Notification['type']) => {
    switch (type) {
      case 'booking':
        return 'bg-blue-50 border-blue-100'
      case 'review':
        return 'bg-amber-50 border-amber-100'
      default:
        return 'bg-slate-50 border-slate-100'
    }
  }

  const filteredNotifications = filter === 'unread'
    ? notifications.filter(notif => !notif.read)
    : notifications

  const unreadCount = notifications.filter(notif => !notif.read).length

  if (!isOpen) return null

  return (
    <>
      <div
        className="fixed inset-0 z-50 bg-black/20 backdrop-blur-sm"
        onClick={onClose}
      />

      <div className="fixed top-16 right-4 z-50 w-96 bg-white rounded-2xl border border-slate-200 shadow-xl animate-in slide-in-from-top-4 duration-200">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="font-bold text-slate-900 text-base">Notifications</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              {unreadCount === 0
                ? "You're all caught up!"
                : `${unreadCount} unread notification${unreadCount !== 1 ? 's' : ''}`}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setFilter(filter === 'all' ? 'unread' : 'all')}
              className="px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors"
            >
              {filter === 'all' ? 'Unread' : 'All'}
            </button>
            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                className="px-3 py-1.5 text-xs font-medium text-blue-600 hover:text-blue-700 transition-colors"
              >
                Mark all read
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors text-slate-400 hover:text-slate-600"
            >
              <XMarkIcon className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="max-h-96 overflow-y-auto">
          {loading ? (
            <div className="p-8 text-center">
              <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
              <p className="text-sm text-slate-500">Loading notifications...</p>
            </div>
          ) : filteredNotifications.length === 0 ? (
            <div className="p-8 text-center">
              <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-3">
                <BellIcon className="w-5 h-5 text-slate-400" />
              </div>
              <p className="text-sm font-medium text-slate-600">
                {filter === 'unread' ? 'No unread notifications' : 'No notifications yet'}
              </p>
              <p className="text-xs text-slate-400 mt-1">
                {filter === 'unread'
                  ? 'All your notifications are marked as read.'
                  : userRole === 'provider'
                    ? 'New service requests from customers will appear here.'
                    : 'You will receive notifications about bookings here.'}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {filteredNotifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`p-4 hover:bg-slate-50 transition-colors ${getNotificationColor(
                    notification.type
                  )} ${!notification.read ? 'border-l-2 border-l-blue-600' : ''}`}
                >
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 mt-0.5">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                        !notification.read ? 'bg-blue-50 ring-1 ring-blue-100' : 'bg-white'
                      }`}>
                        {getNotificationIcon(notification.type)}
                      </div>
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between mb-1">
                        <h4 className="font-semibold text-slate-900 text-sm">
                          {notification.title}
                        </h4>
                        <span className="text-xs text-slate-500 whitespace-nowrap flex-shrink-0 ml-2">
                          {new Date(notification.timestamp).toLocaleDateString('en-IN', {
                            month: 'short',
                            day: 'numeric',
                          })}
                        </span>
                      </div>

                      <p className="text-sm text-slate-600 mb-1">{notification.description}</p>

                      {!notification.read && (
                        <button
                          onClick={() => markAsRead(notification.id)}
                          className="mt-2 text-xs font-medium text-blue-600 hover:text-blue-700"
                        >
                          Mark as read
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="p-3 border-t border-slate-100 bg-slate-50/50 rounded-b-2xl">
          <a
            href={userRole === 'customer' ? '/notifications' : '/provider/notifications'}
            className="block text-center text-sm font-medium text-blue-600 hover:text-blue-700 py-1.5 hover:bg-blue-50 rounded-lg transition-colors"
            onClick={onClose}
          >
            View all notifications
          </a>
        </div>
      </div>
    </>
  )
}

export default NotificationPanel
