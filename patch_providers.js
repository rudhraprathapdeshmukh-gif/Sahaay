const fs = require('fs');
const path = 'src/lib/providers.ts';
let code = fs.readFileSync(path, 'utf8');

if (!code.includes("import { createNotification } from './notifications'")) {
  code = code.replace(
    "import type { BookingStatus } from '@/types/database'",
    "import type { BookingStatus } from '@/types/database'\nimport { createNotification } from './notifications'"
  );
}

code = code.replace(
  /export const updateBookingStatus = async \(bookingId: string, status: BookingStatus\) => {([\s\S]*?)if \(error\) throw error\n  return data\n}/,
  `export const updateBookingStatus = async (bookingId: string, status: BookingStatus) => {
  const { data, error } = await supabase
    .from('bookings')
    .update({ status })
    .eq('id', bookingId)
    .select()
    .single()

  if (error) throw error
  
  try {
    let title = '';
    let body = '';
    let type = '';
    
    // For specific statuses, trigger notification to customer
    if (status === 'in_progress') {
      type = 'journey_started';
      title = 'Provider On The Way 🚗';
      body = 'Your service provider is on their way to your location.';
    } else if (status === 'started' as any) {
      type = 'booking_confirmed';
      title = 'Service Started ⏱️';
      body = 'Your service is now in progress.';
    } else if (status === 'completed') {
      type = 'service_completed';
      title = 'Service Completed 🎉';
      body = 'Your service has been marked as completed. Please leave a review!';
    } else if (status === 'cancelled') {
      type = 'booking_cancelled';
      title = 'Booking Cancelled ❌';
      body = 'Your booking has been cancelled.';
    }
    
    if (title && type) {
      await createNotification({
        user_id: data.customer_id,
        type: type as any,
        title,
        body,
        related_id: data.id,
        related_type: 'booking'
      });
    }
  } catch (err) {
    console.error('Failed to notify customer on status update:', err);
  }
  
  return data
}`
);

fs.writeFileSync(path, code);
