/**
 * Payment Processing Library for Sahaay
 * Handles payment creation, processing, verification, and refunds
 */

import { supabase } from './supabase';
import { createNotification } from './notifications';
import { mockGateway } from './mock-gateway';
import type {
  Payment,
  PaymentMethod,
  PaymentStatus,
  PaymentInsert,
  PaymentUpdate,
  GatewayPaymentRequest
} from '@/types/payments';
import type { Booking } from '@/types/database';

// Generate a unique idempotency key to prevent duplicate payments
export async function generateIdempotencyKey(bookingId: string, customerId: string, amount: number): Promise<string> {
  const timestamp = Date.now().toString();
  const data = `${bookingId}:${customerId}:${amount}:${timestamp}`;

  // Use Web Crypto API (browser-compatible) instead of Node.js crypto
  const encoder = new TextEncoder();
  const dataBuffer = encoder.encode(data);
  const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

  return hashHex;
}

/**
 * Create a new payment record for a booking
 */
export async function createPayment(
  booking: Booking,
  customerId: string,
  paymentMethod: PaymentMethod
): Promise<Payment> {
  const idempotencyKey = await generateIdempotencyKey(booking.id, customerId, booking.amount);

  // Check if there's already a payment for this booking (due to UNIQUE constraint)
  const { data: existingBookingPayment } = await supabase
    .from('payments')
    .select('*')
    .eq('booking_id', booking.id)
    .maybeSingle();

  if (existingBookingPayment) {
    // If there's an existing payment with same booking_id, check status
    if (existingBookingPayment.status === 'paid') {
      throw new Error('Payment already completed for this booking');
    }

    // If pending or failed, we can update it with new payment attempt
    if (existingBookingPayment.status === 'pending' || existingBookingPayment.status === 'failed') {
      const { data: updatedPayment, error: updateError } = await supabase
        .from('payments')
        .update({
          payment_method: paymentMethod,
          status: 'pending',
          idempotency_key: idempotencyKey,
          updated_at: new Date().toISOString(),
        } as PaymentUpdate)
        .eq('id', existingBookingPayment.id)
        .select()
        .single();

      if (updateError) {
        console.error('Error updating existing payment:', updateError);
        throw new Error('Failed to update existing payment');
      }

      return updatedPayment;
    }
  }

  // Check for existing payment with same idempotency key (prevents duplicates)
  const { data: existingIdempotencyPayment } = await supabase
    .from('payments')
    .select('*')
    .eq('idempotency_key', idempotencyKey)
    .maybeSingle();

  if (existingIdempotencyPayment) {
    return existingIdempotencyPayment;
  }

  // Create new payment record
  const { data: payment, error } = await supabase
    .from('payments')
    .insert({
      booking_id: booking.id,
      customer_id: customerId,
      amount: booking.amount,
      payment_method: paymentMethod,
      status: 'pending',
      idempotency_key: idempotencyKey,
    } as PaymentInsert)
    .select()
    .single();

  if (error) {
    console.error('Error creating payment:', error);

    // Check if it's a unique constraint violation (booking_id UNIQUE)
    if (error.code === '23505' && error.message?.includes('payments_booking_id_key')) {
      throw new Error('A payment record already exists for this booking. Please try again.');
    }

    throw new Error('Failed to create payment: ' + (error.message || 'Unknown error'));
  }

  return payment;
}

/**
 * Process payment through the mock gateway
 */
export async function processPayment(
  payment: Payment,
  customerEmail: string,
  customerPhone?: string
): Promise<Payment> {
  if (payment.status === 'paid') {
    return payment; // Already paid
  }

  // Update status to processing
  const { data: processingPayment, error: updateError } = await supabase
    .from('payments')
    .update({
      status: 'processing' as PaymentStatus,
      updated_at: new Date().toISOString()
    } as PaymentUpdate)
    .eq('id', payment.id)
    .select()
    .single();

  if (updateError) {
    console.error('Error updating payment status:', updateError);
    throw new Error('Failed to process payment');
  }

  // Build gateway request
  const gatewayRequest: GatewayPaymentRequest = {
    orderId: payment.booking_id,
    amount: Math.round(payment.amount * 100), // Convert to paise
    currency: 'INR' as const,
    customer: {
      id: payment.customer_id,
      email: customerEmail,
      contact: customerPhone,
    },
    method: payment.payment_method === 'cash' ? 'upi' : payment.payment_method,
    receipt: payment.idempotency_key!,
  };

  // Process through mock gateway
  const gatewayResponse = await mockGateway.processPayment(gatewayRequest);

  // Determine final status
  const status: PaymentStatus = gatewayResponse.status === 'captured' ? 'paid' : 'failed';

  // Update payment with gateway response
  const updateData: PaymentUpdate = {
    status,
    gateway_transaction_id: gatewayResponse.id,
    gateway_response: gatewayResponse as Record<string, unknown>,
    updated_at: new Date().toISOString(),
  };

  if (status === 'paid') {
    updateData.paid_at = new Date().toISOString();
  }

  const { data: finalPayment, error: finalError } = await supabase
    .from('payments')
    .update(updateData)
    .eq('id', payment.id)
    .select()
    .single();

  if (finalError) {
    console.error('Error updating payment with gateway response:', finalError);
    throw new Error('Failed to finalize payment');
  }

  
  try {
    if (status === 'paid') {
      await createNotification({
        user_id: payment.customer_id,
        type: 'payment_success',
        title: 'Payment Successful 💳',
        body: 'Payment of ₹' + payment.amount + ' received successfully.',
        related_id: finalPayment.id,
        related_type: 'payment'
      });
    } else if (status === 'failed') {
      await createNotification({
        user_id: payment.customer_id,
        type: 'payment_failed',
        title: 'Payment Failed ⚠️',
        body: 'Waiting/Failed on payment of ₹' + payment.amount + '. Please check.',
        related_id: finalPayment.id,
        related_type: 'payment'
      });
    }
  } catch (err) {
    console.error('Failed to create payment notification:', err);
  }

  return finalPayment;

}

/**
 * Verify a payment (server-side verification)
 */
export async function verifyPayment(paymentId: string): Promise<{ verified: boolean; payment?: Payment }> {
  const { data: payment } = await supabase
    .from('payments')
    .select('*')
    .eq('id', paymentId)
    .maybeSingle();

  if (!payment) {
    return { verified: false };
  }

  // For mock gateway, verify by checking transaction ID
  if (payment.status === 'paid' && payment.gateway_transaction_id) {
    const verification = await mockGateway.verifyPayment(payment.gateway_transaction_id);
    return {
      verified: verification.status === 'captured',
      payment
    };
  }

  return { verified: payment.status === 'paid', payment };
}

/**
 * Process a refund
 */
export async function processRefund(
  paymentId: string,
  refundReason: 'provider_cancelled' | 'customer_cancelled_pre_acceptance' | 'customer_dispute',
  initiatedBy: 'system' | 'admin' | 'customer'
): Promise<{ success: boolean; refundId?: string; error?: string }> {
  // Get the payment
  const { data: payment } = await supabase
    .from('payments')
    .select('*')
    .eq('id', paymentId)
    .maybeSingle();

  if (!payment) {
    return { success: false, error: 'Payment not found' };
  }

  if (payment.status !== 'paid') {
    return { success: false, error: 'Cannot refund a payment that is not paid' };
  }

  if (payment.status === 'refunded') {
    return { success: false, error: 'Payment already refunded' };
  }

  // Create refund record
  const { data: refund, error: refundError } = await supabase
    .from('refunds')
    .insert({
      payment_id: paymentId,
      booking_id: payment.booking_id,
      refund_amount: payment.amount,
      refund_reason,
      initiated_by: initiatedBy,
      status: 'processing',
    })
    .select()
    .single();

  if (refundError) {
    console.error('Error creating refund record:', refundError);
    return { success: false, error: 'Failed to create refund record' };
  }

  // Process refund through gateway
  const refundResult = await mockGateway.processRefund(payment.gateway_transaction_id!, payment.amount);

  if (refundResult.success) {
    // Update refund status
    await supabase
      .from('refunds')
      .update({
        status: 'completed' as const,
        gateway_refund_id: refundResult.refundId,
        completed_at: new Date().toISOString(),
      })
      .eq('id', refund.id);

    // Update payment status
    await supabase
      .from('payments')
      .update({
        status: 'refunded' as PaymentStatus,
        refunded_at: new Date().toISOString(),
        refund_reason,
        refund_amount: payment.amount,
        updated_at: new Date().toISOString(),
      } as PaymentUpdate)
      .eq('id', paymentId);

    return { success: true, refundId: refundResult.refundId };
  } else {
    // Mark refund as failed
    await supabase
      .from('refunds')
      .update({
        status: 'failed' as const,
      })
      .eq('id', refund.id);

    return { success: false, error: refundResult.error };
  }
}

/**
 * Get payment by booking ID
 */
export async function getPaymentByBooking(bookingId: string): Promise<Payment | null> {
  const { data } = await supabase
    .from('payments')
    .select('*')
    .eq('booking_id', bookingId)
    .maybeSingle();
  return data;
}

/**
 * Get payments for a customer
 */
export async function getCustomerPayments(
  customerId: string,
  options?: { limit?: number; status?: PaymentStatus }
): Promise<Payment[]> {
  let query = supabase
    .from('payments')
    .select('*')
    .eq('customer_id', customerId)
    .order('created_at', { ascending: false });

  if (options?.limit) {
    query = query.limit(options.limit);
  }

  if (options?.status) {
    query = query.eq('status', options.status);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching customer payments:', error);
    throw new Error('Failed to fetch payments');
  }

  return data || [];
}

/**
 * Update payment status
 */
export async function updatePaymentStatus(
  paymentId: string,
  status: PaymentStatus
): Promise<Payment> {
  const updateData: PaymentUpdate = {
    status,
    updated_at: new Date().toISOString(),
  };

  if (status === 'paid') {
    updateData.paid_at = new Date().toISOString();
  }

  const { data, error } = await supabase
    .from('payments')
    .update(updateData)
    .eq('id', paymentId)
    .select()
    .single();

  if (error) {
    console.error('Error updating payment status:', error);
    throw new Error('Failed to update payment');
  }

  return data;
}