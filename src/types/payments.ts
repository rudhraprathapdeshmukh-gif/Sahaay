// Payment system type definitions for Sahaay

export type PaymentMethod = 'upi' | 'card' | 'net_banking' | 'cash';
export type PaymentStatus = 'pending' | 'processing' | 'paid' | 'failed' | 'refunded';
export type RefundReason = 'provider_cancelled' | 'customer_cancelled_pre_acceptance' | 'customer_dispute';
export type RefundStatus = 'pending' | 'processing' | 'completed' | 'failed';
export type PayoutStatus = 'pending' | 'processing' | 'completed' | 'failed';

export interface Payment {
  id: string;
  booking_id: string;
  customer_id: string;
  amount: number;
  payment_method: PaymentMethod;
  status: PaymentStatus;
  gateway_transaction_id?: string;
  gateway_response?: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  paid_at?: string;
  refunded_at?: string;
  refund_reason?: RefundReason;
  refund_amount?: number;
  idempotency_key?: string;
}

export interface PaymentWithDetails extends Payment {
  booking?: {
    id: string;
    service: { name: string };
    provider?: { user: { full_name: string } };
    scheduled_at: string | null;
  };
}

export interface ProviderEarning {
  id: string;
  booking_id: string;
  provider_id: string;
  payment_id: string;
  service_amount: number;
  platform_fee: number;
  provider_earning: number;
  payout_status: PayoutStatus;
  payout_date?: string;
  payout_method?: string;
  created_at: string;
  updated_at: string;
}

export interface ProviderEarningWithDetails extends ProviderEarning {
  booking?: {
    id: string;
    service: { name: string };
    customer: { full_name: string };
    completed_at: string | null;
  };
  payment?: {
    status: PaymentStatus;
    paid_at: string | null;
  };
}

export interface Refund {
  id: string;
  payment_id: string;
  booking_id: string;
  refund_amount: number;
  refund_reason: RefundReason;
  initiated_by: 'system' | 'admin' | 'customer';
  status: RefundStatus;
  gateway_refund_id?: string;
  created_at: string;
  completed_at?: string;
}

export interface RefundWithDetails extends Refund {
  payment?: Payment;
  booking?: {
    id: string;
    service: { name: string };
    customer: { full_name: string };
  };
}

// Gateway request/response types
export interface GatewayPaymentRequest {
  orderId: string;
  amount: number; // in paise
  currency: 'INR';
  customer: {
    id: string;
    email: string;
    contact?: string;
  };
  method: 'upi' | 'card' | 'netbanking';
  upi_id?: string;
  card?: { last4: string };
  receipt: string;
}

export interface GatewayPaymentResponse {
  id: string;
  entity: 'payment';
  status: 'captured' | 'failed';
  amount: number;
  currency: 'INR';
  receipt: string;
  created_at: number;
  error?: {
    code: string;
    description: string;
  };
}

// Insert types
export type PaymentInsert = Omit<Payment, 'id' | 'created_at' | 'updated_at' | 'paid_at' | 'refunded_at'>;
export type ProviderEarningInsert = Omit<ProviderEarning, 'id' | 'created_at' | 'updated_at' | 'payout_date'>;
export type RefundInsert = Omit<Refund, 'id' | 'created_at' | 'completed_at'>;

// Update types
export type PaymentUpdate = Partial<Omit<Payment, 'id' | 'booking_id' | 'customer_id' | 'created_at'>>;
export type ProviderEarningUpdate = Partial<Omit<ProviderEarning, 'id' | 'booking_id' | 'provider_id' | 'payment_id' | 'created_at'>>;
export type RefundUpdate = Partial<Omit<Refund, 'id' | 'payment_id' | 'booking_id' | 'created_at'>>;