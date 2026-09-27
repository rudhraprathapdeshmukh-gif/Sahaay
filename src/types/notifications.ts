// Notification system type definitions for Sahaay

export type NotificationType =
  | 'booking_request'
  | 'booking_accepted'
  | 'booking_confirmed'
  | 'booking_cancelled'
  | 'journey_started'
  | 'arrived'
  | 'service_completed'
  | 'payment_success'
  | 'payment_failed'
  | 'new_review'
  | 'booking_reminder';

export type RelatedType = 'booking' | 'payment' | 'review' | 'provider' | null;

export interface Notification {
  id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  body: string;
  related_id: string | null;
  related_type: RelatedType;
  read_at: string | null;
  deleted_at: string | null;
  created_at: string;
}

export interface NotificationWithCount {
  notifications: Notification[];
  unreadCount: number;
}

export type NotificationInsert = Omit<Notification, 'id' | 'read_at' | 'deleted_at' | 'created_at'>;