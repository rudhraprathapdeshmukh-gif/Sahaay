/**
 * Provider Earnings Library for Sahaay
 * Handles earnings calculation, tracking, and payout management
 */

import { supabase } from './supabase';
import type {
  ProviderEarning,
  ProviderEarningInsert,
  ProviderEarningUpdate,
  PayoutStatus
} from '@/types/payments';
import type { Booking } from '@/types/database';
import { getCategoryPricing } from '@/lib/pricing';

/**
 * Calculate provider earning and platform fee for a booking
 */
export function calculateEarnings(amount: number, categorySlug: string): {
  platformFee: number;
  providerEarning: number;
  platformFeePercentage: number;
  providerEarningPercentage: number;
} {
  const category = getCategoryPricing(categorySlug);

  if (!category) {
    throw new Error(`Category ${categorySlug} not found in pricing`);
  }

  const platformFee = Math.round((amount * category.platformFeePercentage) / 100);
  const providerEarning = amount - platformFee;

  return {
    platformFee,
    providerEarning,
    platformFeePercentage: category.platformFeePercentage,
    providerEarningPercentage: category.providerEarningPercentage,
  };
}

/**
 * Get the service category slug from a booking
 */
async function getServiceSlug(serviceId: number): Promise<string> {
  const { data: service } = await supabase
    .from('services')
    .select('slug')
    .eq('id', serviceId)
    .maybeSingle();

  if (!service) {
    throw new Error(`Service ${serviceId} not found`);
  }

  return service.slug;
}

/**
 * Create a provider earning record after payment is confirmed
 */
export async function createProviderEarning(
  booking: Booking,
  paymentId: string,
  providerId: string,
  totalAmount: number
): Promise<ProviderEarning> {
  // Verify payment is complete
  const { data: payment } = await supabase
    .from('payments')
    .select('status')
    .eq('id', paymentId)
    .maybeSingle();

  if (!payment || payment.status !== 'paid') {
    throw new Error('Can only create earnings for paid payments');
  }

  // Check if earnings already exist
  const { data: existingEarning } = await supabase
    .from('provider_earnings')
    .select('*')
    .eq('booking_id', booking.id)
    .maybeSingle();

  if (existingEarning) {
    return existingEarning;
  }

  // Get service category to calculate fees
  const serviceSlug = await getServiceSlug(booking.service_id);
  const { platformFee, providerEarning } = calculateEarnings(totalAmount, serviceSlug);

  const { data: earning, error } = await supabase
    .from('provider_earnings')
    .insert({
      booking_id: booking.id,
      provider_id: providerId,
      payment_id: paymentId,
      service_amount: totalAmount,
      platform_fee: platformFee,
      provider_earning: providerEarning,
      payout_status: 'pending',
    } as ProviderEarningInsert)
    .select()
    .single();

  if (error) {
    console.error('Error creating provider earning:', error);
    throw new Error('Failed to create provider earning');
  }

  return earning;
}

/**
 * Get all earnings for a provider
 */
export async function getProviderEarnings(
  providerId: string,
  options?: { limit?: number; status?: PayoutStatus }
): Promise<ProviderEarning[]> {
  let query = supabase
    .from('provider_earnings')
    .select('*')
    .eq('provider_id', providerId)
    .order('created_at', { ascending: false });

  if (options?.limit) {
    query = query.limit(options.limit);
  }

  if (options?.status) {
    query = query.eq('payout_status', options.status);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching provider earnings:', error);
    throw new Error('Failed to fetch earnings');
  }

  return data || [];
}

/**
 * Get earnings summary for a provider
 */
export async function getProviderEarningsSummary(providerId: string): Promise<{
  pendingEarnings: number;
  paidThisMonth: number;
  totalAllTime: number;
  nextPayoutDate: string;
  pendingCount: number;
}> {
  // Get all earnings
  const earnings = await getProviderEarnings(providerId);

  // Calculate totals
  let pendingEarnings = 0;
  let paidThisMonth = 0;
  let totalAllTime = 0;
  let pendingCount = 0;

  const now = new Date();
  const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  earnings.forEach(earning => {
    totalAllTime += earning.provider_earning;

    if (earning.payout_status === 'pending' || earning.payout_status === 'processing') {
      pendingEarnings += earning.provider_earning;
      pendingCount++;
    }

    if (earning.payout_status === 'completed' && earning.payout_date) {
      const payoutDate = new Date(earning.payout_date);
      if (payoutDate >= firstDayOfMonth) {
        paidThisMonth += earning.provider_earning;
      }
    }
  });

  // Next payout date (assuming weekly payouts on Mondays)
  const nextMonday = new Date(now);
  nextMonday.setDate(now.getDate() + ((1 + 7 - now.getDay()) % 7 || 7));
  nextMonday.setHours(10, 0, 0, 0);

  // If it's already past 10 AM today, move to next week
  if (now >= nextMonday) {
    nextMonday.setDate(nextMonday.getDate() + 7);
  }

  return {
    pendingEarnings,
    paidThisMonth,
    totalAllTime,
    nextPayoutDate: nextMonday.toISOString(),
    pendingCount,
  };
}

/**
 * Mark earnings as paid out (called by payout job)
 */
export async function markEarningsAsPaid(
  earningIds: string[],
  payoutMethod: string = 'bank_transfer'
): Promise<{ success: boolean; count: number }> {
  if (earningIds.length === 0) {
    return { success: true, count: 0 };
  }

  const { error } = await supabase
    .from('provider_earnings')
    .update({
      payout_status: 'completed' as PayoutStatus,
      payout_date: new Date().toISOString(),
      payout_method: payoutMethod,
      updated_at: new Date().toISOString(),
    } as ProviderEarningUpdate)
    .in('id', earningIds)
    .eq('payout_status', 'pending');

  if (error) {
    console.error('Error marking earnings as paid:', error);
    return { success: false, count: 0 };
  }

  return { success: true, count: earningIds.length };
}

/**
 * Process automatic payouts for all pending earnings
 * Called by scheduled job (e.g., nightly cron)
 */
export async function processAutomaticPayouts(): Promise<{
  totalProviders: number;
  totalAmount: number;
  payoutsCompleted: number;
}> {
  // Get all providers with pending earnings
  const { data: pendingEarnings } = await supabase
    .from('provider_earnings')
    .select('id, provider_id, provider_earning')
    .eq('payout_status', 'pending');

  if (!pendingEarnings || pendingEarnings.length === 0) {
    return { totalProviders: 0, totalAmount: 0, payoutsCompleted: 0 };
  }

  // Group by provider
  const byProvider = new Map<string, string[]>();
  let totalAmount = 0;

  pendingEarnings.forEach(earning => {
    const ids = byProvider.get(earning.provider_id) || [];
    ids.push(earning.id);
    byProvider.set(earning.provider_id, ids);
    totalAmount += earning.provider_earning;
  });

  // Process payouts for each provider
  let payoutsCompleted = 0;

  for (const [providerId, earningIds] of byProvider) {
    const result = await markEarningsAsPaid(earningIds);
    if (result.success) {
      payoutsCompleted++;
    }
  }

  return {
    totalProviders: byProvider.size,
    totalAmount,
    payoutsCompleted,
  };
}

/**
 * Get payment details for a specific earning
 */
export async function getEarningWithPayment(earningId: string): Promise<{
  earning: ProviderEarning;
  payment: { status: string; paid_at: string | null };
  booking: {
    id: string;
    service: { name: string };
    customer: { full_name: string };
    completed_at: string | null;
  } | null;
} | null> {
  const { data } = await supabase
    .from('provider_earnings')
    .select(`
      *,
      payment:payments(status, paid_at),
      booking:bookings(
        id,
        completed_at,
        service:services(name),
        customer:users!bookings_customer_id_fkey(full_name)
      )
    `)
    .eq('id', earningId)
    .maybeSingle();

  return data;
}