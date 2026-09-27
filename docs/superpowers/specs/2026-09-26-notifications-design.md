# Real-Time Notification System Design

## Goal
Implement a real-time notification system that alerts customers, providers, and admins about booking lifecycle events, payment status changes, and reviews. Users see a notification bell with unread count, click to view and mark as read, with navigation to context-specific pages.

## Architecture
The system uses Supabase for storage and real-time subscriptions. A library layer (`src/lib/notifications.ts`) handles CRUD operations and role-based notification creation. UI components (`NotificationBell`, `NotificationDropdown`, `NotificationPage`) display notifications with real-time updates via Supabase Realtime subscriptions. Integration points in `bookings.ts` and `payments.ts` trigger notifications on status changes. Row-Level Security (RLS) policies ensure users see only their own notifications based on role.

## Tech Stack
- React + TypeScript for UI components
- Tailwind CSS for styling
- Supabase for database, real-time subscriptions, and RLS
- React Router for navigation

## Spec
This design implements the requirements from the notification system request.

---

## Global Constraints

- Must not break existing booking or payment features
- All notifications stored in Supabase (no in-app-only state)
- RLS policies enforce role-based access (customers see own, providers see relevant, admins see all)
- Real-time updates via Supabase Realtime subscriptions
- Mobile responsive (16px gutter, no horizontal scroll)
- Soft deletes via `deleted_at` timestamp
- Clicking notification marks as read AND navigates to context-specific page

---

## Review Focus

1. **Unread count accuracy when notifications arrive in real-time** — Count must update immediately when other sessions create notifications, not lag until next manual refresh.
2. **RLS policies prevent unauthorized access** — Customers cannot see provider notifications, providers cannot see admin notifications, cross-user leakage possible if policies are misconfigured.
3. **Missing integration points in booking/payment flows** — Notifications not triggered when booking status changes or payment completes because integration not wired.
4. **Navigation to deleted or non-existent bookings** — Clicking notification for deleted booking should handle gracefully (not 404 page).
5. **Notification dropdown stays in sync during mark-as-read operations** — Optimistic UI updates may conflict with real-time updates if not sequenced correctly.

---

## Database Schema

### Notifications Table
```sql
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN (
    'booking_request', 'booking_accepted', 'booking_confirmed', 
    'booking_cancelled', 'journey_started', 'arrived', 
    'service_completed', 'payment_success', 'payment_failed', 
    'new_review', 'booking_reminder'
  )),
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  related_id UUID, -- booking_id, payment_id, review_id, etc.
  related_type TEXT CHECK (related_type IN ('booking', 'payment', 'review', 'provider')),
  read_at TIMESTAMPTZ,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT notification_not_spam CHECK (
    -- Prevent duplicate notifications within 5 seconds for same type/related_id
    true -- enforced via application logic
  )
);

CREATE INDEX idx_notifications_user ON public.notifications(user_id);
CREATE INDEX idx_notifications_user_read ON public.notifications(user_id, read_at);
CREATE INDEX idx_notifications_created ON public.notifications(created_at DESC);
```

### RLS Policies
```sql
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Customers see only their own notifications
CREATE POLICY "Users see own notifications" ON public.notifications
  FOR SELECT USING (user_id = auth.uid());

-- System (service role) can insert for any user
CREATE POLICY "System can insert notifications" ON public.notifications
  FOR INSERT WITH CHECK (true);

-- Users can update their own notifications (mark as read, soft delete)
CREATE POLICY "Users can update own notifications" ON public.notifications
  FOR UPDATE USING (user_id = auth.uid());

-- Admins see all notifications
CREATE POLICY "Admins see all notifications" ON public.notifications
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
  );
```

---

## Core Components

### 1. Notification Library (`src/lib/notifications.ts`)

**Responsibilities:**
- CRUD operations on notifications table
- Real-time subscription helpers
- Notification creation with role-based logic

**Key Functions:**

```typescript
// Create a notification (system function, calls with service role)
export async function createNotification(payload: {
  user_id: string
  type: NotificationType
  title: string
  body: string
  related_id?: string
  related_type?: string
}): Promise<Notification>

// Get unread count for a user
export async function getUnreadCount(userId: string): Promise<number>

// Fetch notifications with pagination
export async function getNotifications(
  userId: string,
  options?: { limit?: number; offset?: number; includeRead?: boolean }
): Promise<Notification[]>

// Mark single notification as read
export async function markAsRead(notificationId: string): Promise<Notification>

// Mark all notifications as read
export async function markAllAsRead(userId: string): Promise<void>

// Subscribe to real-time notification updates
export function subscribeToNotifications(
  userId: string,
  onNotification: (notification: Notification) => void,
  onError?: (error: Error) => void
): Subscription

// Soft delete notification
export async function deleteNotification(notificationId: string): Promise<void>
```

### 2. UI Components

#### NotificationBell
- Display bell icon with unread count badge
- Positioned in header/navigation
- Red badge shows count > 0
- Click opens dropdown

#### NotificationDropdown
- Scrollable list of recent notifications (limit 10)
- Each item shows title, body, timestamp, read status
- Click to mark as read and navigate
- "View All" link to notification page
- Loading state during subscription

#### NotificationPage
- Full page view of all notifications (paginated, 20 per page)
- Filter by read/unread
- Mark as read/unread toggles
- Delete button per notification
- "Clear all" button for batch delete
- Empty state message

---

## Integration Points

### Booking Status Changes
Trigger notifications when booking status transitions:

| Status Change | Notification Type | Recipients |
|---|---|---|
| broadcast → accepted | `booking_accepted` | Customer |
| broadcast → confirmed | `booking_confirmed` | Customer, Provider |
| confirmed → cancelled | `booking_cancelled` | Customer, Provider |
| confirmed → in_progress | `journey_started` | Customer |
| in_progress → arrived | `arrived` | Customer |
| in_progress → completed | `service_completed` | Customer, Provider |

**Implementation:** Add notification calls to `updateBookingStatus()` in `src/lib/bookings.ts`.

### Payment Status Changes
Trigger notifications when payment completes:

| Payment Status | Notification Type | Recipients |
|---|---|---|
| paid | `payment_success` | Customer |
| failed | `payment_failed` | Customer |

**Implementation:** Add notification calls to `processPayment()` in `src/lib/payments.ts`.

### Review Creation
Trigger notification when provider receives review:

| Event | Notification Type | Recipients |
|---|---|---|
| review created | `new_review` | Provider |

**Implementation:** Add notification call to `submitReview()` in `src/lib/bookings.ts`.

### Booking Reminders (Future)
Scheduled job to send reminders 1 hour before scheduled service. Implementation deferred to Phase 2.

---

## Navigation Targets

When notification is clicked, navigate based on type and related_type:

| Type | Target |
|---|---|
| booking_* | `/bookings/{related_id}` (booking detail page) |
| payment_success / payment_failed | `/payment-history` (customer's payment history) |
| new_review | `/provider/{provider_id}` (provider's profile) |

**Implementation:** Use `related_id` and `related_type` to construct navigation path in click handler.

---

## Real-Time Flow

1. Notification created via `createNotification()`
2. Supabase stores in `notifications` table
3. RLS policy allows insert (system role) and restricts SELECT to user_id
4. Subscribed clients receive event via `subscribeToNotifications()`
5. UI updates immediately with new notification + incremented unread count
6. Notification dropdown and bell badge re-render in real-time

---

## Error Handling

- **Subscription fails:** Show error toast, auto-retry with exponential backoff
- **Mark as read fails:** Keep UI in previous state, show retry option
- **Navigation to deleted booking:** Catch error, show message "Booking no longer exists"
- **RLS blocks read:** User sees no notifications (not an error, just empty state)
- **Unread count query times out:** Use cached value from last successful query

---

## Testing Strategy

- Unit tests for notification library functions (create, fetch, mark as read)
- Integration tests for subscription real-time updates
- Component tests for NotificationBell unread count badge update
- E2E tests for full flow: booking status → notification → click → navigate
- RLS policy tests (users cannot see others' notifications)

---

## File Structure

**New Files:**
- `src/lib/notifications.ts` — Core notification library
- `src/types/notifications.ts` — TypeScript types
- `src/components/NotificationBell.tsx` — Bell icon with badge
- `src/components/NotificationDropdown.tsx` — Dropdown list
- `src/pages/NotificationPage.tsx` — Full page view
- `supabase/migrations/20260926001000_add_notifications.sql` — Database migration

**Modified Files:**
- `src/lib/bookings.ts` — Add notification calls on status change
- `src/lib/payments.ts` — Add notification calls on payment completion
- `src/components/Header.tsx` — Add NotificationBell
- `src/App.tsx` — Add notification route

---

## Implementation Order

1. **Phase 1:** Database schema + types
2. **Phase 2:** Notification library + basic CRUD
3. **Phase 3:** UI components (Bell, Dropdown, Page)
4. **Phase 4:** Real-time subscriptions + real-time updates
5. **Phase 5:** Integration with booking/payment flows
6. **Phase 6:** Navigation and routing
7. **Phase 7:** Testing and polish

