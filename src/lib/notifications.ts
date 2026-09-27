import { supabase } from './supabase';
import type { Notification, NotificationInsert } from '@/types/notifications';

/**
 * Create a new notification
 */
export async function createNotification(payload: NotificationInsert): Promise<Notification> {
  const { data, error } = await supabase
    .from('notifications')
    .insert({
      ...payload,
      read_at: null,
      deleted_at: null,
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating notification:', error);
    throw new Error(`Failed to create notification: ${error.message}`);
  }

  return data;
}

/**
 * Get unread notification count for a user
 */
export async function getUnreadCount(userId: string): Promise<number> {
  const { count, error } = await supabase
    .from('notifications')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .is('read_at', null)
    .is('deleted_at', null);

  if (error) {
    console.error('Error fetching unread count:', error);
    return 0;
  }

  return count ?? 0;
}

/**
 * Fetch notifications for a user with pagination
 */
export async function getNotifications(
  userId: string,
  options?: { limit?: number; offset?: number; includeRead?: boolean }
): Promise<Notification[]> {
  let query = supabase
    .from('notifications')
    .select('*')
    .eq('user_id', userId)
    .is('deleted_at', null)
    .order('created_at', { ascending: false });

  if (!options?.includeRead) {
    query = query.is('read_at', null);
  }

  if (options?.limit) {
    query = query.limit(options.limit);
  }

  if (options?.offset) {
    query = query.range(options.offset, options.offset + (options.limit || 20) - 1);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching notifications:', error);
    return [];
  }

  return data || [];
}

/**
 * Mark a single notification as read
 */
export async function markAsRead(notificationId: string): Promise<Notification> {
  const { data, error } = await supabase
    .from('notifications')
    .update({ read_at: new Date().toISOString() })
    .eq('id', notificationId)
    .select()
    .single();

  if (error) {
    console.error('Error marking notification as read:', error);
    throw new Error(`Failed to mark as read: ${error.message}`);
  }

  return data;
}

/**
 * Mark all unread notifications as read for a user
 */
export async function markAllAsRead(userId: string): Promise<void> {
  const { error } = await supabase
    .from('notifications')
    .update({ read_at: new Date().toISOString() })
    .eq('user_id', userId)
    .is('read_at', null)
    .is('deleted_at', null);

  if (error) {
    console.error('Error marking all notifications as read:', error);
    throw new Error('Failed to mark all as read');
  }
}

/**
 * Soft delete a notification
 */
export async function deleteNotification(notificationId: string): Promise<void> {
  const { error } = await supabase
    .from('notifications')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', notificationId);

  if (error) {
    console.error('Error deleting notification:', error);
    throw new Error('Failed to delete notification');
  }
}

/**
 * Subscribe to real-time notification updates for a user
 */
export function subscribeToNotifications(
  userId: string,
  onNotification: (notification: Notification) => void,
  onError?: (error: Error) => void
) {
  const channel = supabase
    .channel('notifications-' + userId)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${userId}`,
      },
      (payload) => {
        const notification = payload.new as Notification;
        if (!notification.deleted_at) {
          onNotification(notification);
        }
      }
    )
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${userId}`,
      },
      (payload) => {
        const notification = payload.new as Notification;
        onNotification(notification);
      }
    )
    .subscribe((status) => {
      if (status === 'CHANNEL_ERROR' && onError) {
        onError(new Error('Notification subscription failed'));
      }
    });

  return {
    unsubscribe: () => {
      supabase.removeChannel(channel);
    }
  };
}