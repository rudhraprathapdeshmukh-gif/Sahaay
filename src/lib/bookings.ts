import { supabase } from './supabase'
import type { Booking, BookingInsert, BookingStatus, Review, ReviewInsert } from '@/types/database'
import { createNotification } from './notifications'

const MAX_ACTIVE_SERVICES = 1

// ── Booking Management ──────────────────────────────────────────

export const fetchCustomerActiveBookingsCount = async (customerId: string): Promise<number> => {
  const { count, error } = await supabase
    .from('bookings')
    .select('id', { count: 'exact', head: true })
    .eq('customer_id', customerId)
    .in('status', ['broadcast', 'pending', 'confirmed', 'in_progress'])

  if (error) throw error
  return count ?? 0
}

export const checkDoubleBooking = async (
  providerId: string,
  scheduledAt: string | null
): Promise<boolean> => {
  // If no specific time, allow (ASAP requests don't block)
  if (!scheduledAt) return false

  // Check for any active bookings at the same time slot (within 30 minutes)
  const scheduledTime = new Date(scheduledAt)
  const timeWindowStart = new Date(scheduledTime.getTime() - 30 * 60000) // 30 min before
  const timeWindowEnd = new Date(scheduledTime.getTime() + 30 * 60000) // 30 min after

  const { data: existingBooking, error } = await supabase
    .from('bookings')
    .select('id')
    .eq('provider_id', providerId)
    .in('status', ['pending', 'confirmed', 'in_progress'])
    .gte('scheduled_at', timeWindowStart.toISOString())
    .lte('scheduled_at', timeWindowEnd.toISOString())
    .limit(1)

  if (error) throw error
  return (existingBooking?.length ?? 0) > 0
}

export const requestService = async (payload: {
  customer_id: string
  provider_id: string | null
  service_id: number
  scheduled_at: string | null
  address: string
  notes?: string
  amount: number
  latitude: number | null
  longitude: number | null
  payment_timing?: 'upfront' | 'post_service'
}): Promise<Booking> => {
  const activeCount = await fetchCustomerActiveBookingsCount(payload.customer_id)

  if (activeCount >= MAX_ACTIVE_SERVICES) {
    throw new Error('You have reached the maximum limit of 1 active service. Please complete or cancel an existing service before starting a new one.')
  }

  // Validate scheduled_at is within 7 days and in the future
  if (payload.scheduled_at) {
    const scheduledTime = new Date(payload.scheduled_at)
    const now = new Date()
    const maxDate = new Date()
    maxDate.setDate(maxDate.getDate() + 7)

    // Check if the scheduled time is in the past
    if (scheduledTime <= now) {
      throw new Error('Cannot book services in the past. Please select a future date and time.')
    }

    // Check if the scheduled time is beyond 7 days
    if (scheduledTime > maxDate) {
      throw new Error('Services can only be booked within 7 days from now. Please select an earlier date.')
    }
  }

  // On-demand matching model: always create request without provider (broadcast to nearby providers)
  // The provider_id parameter is ignored to enforce the new matching flow
  const { data, error } = await supabase
    .from('bookings')
    .insert({
      customer_id: payload.customer_id,
      provider_id: null, // Always null - providers accept from pool
      service_id: payload.service_id,
      status: 'broadcast', // New status for on-demand matching
      scheduled_at: payload.scheduled_at,
      address: payload.address,
      notes: payload.notes ?? null,
      amount: payload.amount,
      latitude: payload.latitude,
      longitude: payload.longitude,
    })
    .select()
    .single()

  if (error) throw error
  
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

  return data
}

/**
 * Provider accepts a broadcast request (on-demand matching)
 * This locks the request to the provider and removes it from other providers' lists
 */
export const acceptRequest = async (bookingId: string, providerId: string): Promise<{ success: boolean; booking?: Booking; error?: string }> => {
  try {
    // Use a transaction-like approach to prevent race conditions
    // Only update if status is 'broadcast' and provider_id is null
    const { data, error } = await supabase
      .from('bookings')
      .update({
        provider_id: providerId,
        status: 'confirmed'
      })
      .eq('id', bookingId)
      .eq('status', 'broadcast')
      .is('provider_id', null)
      .select()
      .single()

    if (error) {
      // If no rows updated, the request was already taken
      if (error.code === 'PGRST116') {
        return { success: false, error: 'This request has already been accepted by another provider.' }
      }
      throw error
    }

    
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
  
    return { success: true, booking: data }
  } catch (err) {
    console.error('Error accepting request:', err)
    return { success: false, error: 'Failed to accept request. Please try again.' }
  }
}

export const fetchCustomerBookings = async (customerId: string) => {
  const { data, error } = await supabase
    .from('bookings')
    .select(`
      *,
      provider:service_providers(
        id,
        user:users(full_name, avatar_url, phone),
        service:services(name),
        rating,
        profile_photo_url
      ),
      reviews(id, rating, comment)
    `)
    .eq('customer_id', customerId)
    .order('created_at', { ascending: false })

  if (error) throw error
  return data
}

export const updateBookingStatus = async (bookingId: string, status: BookingStatus) => {
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
}

export const deleteBooking = async (bookingId: string) => {
  const { data, error } = await supabase
    .from('bookings')
    .delete()
    .eq('id', bookingId)
    .select()

  if (error) throw error
  return data
}

// ── Review Management ──────────────────────────────────────────

export const submitReview = async (payload: ReviewInsert): Promise<Review> => {
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
}

export const checkIfReviewed = async (bookingId: string): Promise<boolean> => {
  const { data, error } = await supabase
    .from('reviews')
    .select('id')
    .eq('booking_id', bookingId)
    .maybeSingle()

  if (error) throw error
  return !!data
}
