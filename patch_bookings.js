const fs = require('fs');

const path = 'src/lib/bookings.ts';
let code = fs.readFileSync(path, 'utf8');

// Add import if not exists
if (!code.includes("import { createNotification } from './notifications'")) {
  code = code.replace(
    "import type { Booking, BookingInsert, BookingStatus, Review, ReviewInsert } from '@/types/database'",
    "import type { Booking, BookingInsert, BookingStatus, Review, ReviewInsert } from '@/types/database'\nimport { createNotification } from './notifications'"
  );
}

// requestService:
code = code.replace(
  "if (error) throw error\n  return data",
  `if (error) throw error
  
  // NOTE: Broadcast request does not notify a specific provider yet, 
  // but customer can receive a confirmation.
  try {
    await createNotification({
      user_id: payload.customer_id,
      type: 'booking_request',
      title: 'Service Requested',
      body: 'Your service request has been broadcasted to nearby providers.',
      related_id: data.id,
      related_type: 'booking'
    });
  } catch (err) {
    console.error('Failed to notify customer:', err)
  }

  return data`
);

// acceptRequest:
code = code.replace(
  "return { success: true, booking: data }",
  `
    try {
      // Notify customer
      await createNotification({
        user_id: data.customer_id,
        type: 'booking_accepted',
        title: 'Provider Assigned! 🎉',
        body: 'A provider has accepted your service request and is confirmed.',
        related_id: data.id,
        related_type: 'booking'
      });
      
      // Get provider's user_id from service_providers
      const { data: providerData } = await supabase
        .from('service_providers')
        .select('user_id')
        .eq('id', providerId)
        .single();
        
      if (providerData) {
        await createNotification({
          user_id: providerData.user_id,
          type: 'booking_confirmed',
          title: 'Booking Confirmed 💼',
          body: 'You have successfully claimed the service request.',
          related_id: data.id,
          related_type: 'booking'
        });
      }
    } catch (err) {
      console.error('Failed to create notifications for acceptRequest:', err);
    }
  
    return { success: true, booking: data }`
);

// updateBookingStatus:
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

// submitReview
code = code.replace(
  /export const submitReview = async \(payload: ReviewInsert\): Promise<Review> => {([\s\S]*?)if \(error\) throw error\n  return data\n}/,
  `export const submitReview = async (payload: ReviewInsert): Promise<Review> => {
  const { data, error } = await supabase
    .from('reviews')
    .insert(payload)
    .select()
    .single()

  if (error) throw error
  
  try {
    // Notify the provider
    const { data: providerData } = await supabase
      .from('service_providers')
      .select('user_id')
      .eq('id', payload.provider_id)
      .single();
      
    if (providerData) {
      await createNotification({
        user_id: providerData.user_id,
        type: 'new_review',
        title: 'New Review ⭐',
        body: 'You received a new ' + payload.rating + '-star review for your service!',
        related_id: data.id,
        related_type: 'review'
      });
    }
  } catch (err) {
    console.error('Failed to notify provider on review:', err);
  }
  
  return data
}`
);

fs.writeFileSync(path, code);
