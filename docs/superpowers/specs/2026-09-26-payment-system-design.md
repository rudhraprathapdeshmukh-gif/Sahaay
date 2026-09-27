# Sahaay Payment System Design Specification

**Date:** September 26, 2026  
**Status:** Design Review  
**Scope:** Add complete payment processing system to Sahaay booking platform

---

## 1. Overview

### Purpose
Integrate a complete payment system into Sahaay that:
- Processes payments via UPI, Card, Net Banking, and Cash on Service
- Supports both upfront (before service) and post-service payment options
- Tracks payment status through lifecycle: Pending → Processing → Paid/Failed → Refunded
- Auto-refunds customers when provider cancels or customer cancels before any provider accepts
- Auto-transfers provider earnings after successful payment + service completion
- Provides payment history for customers, earnings dashboards for providers, and management tools for admins

### Design Principles
1. **Non-breaking:** Payment system integrates with existing bookings without modifying existing tables
2. **Mockable:** Payment gateway is mock-implementation (swap to Razorpay later)
3. **Idempotent:** Server-side checks prevent duplicate payments
4. **Secure:** RLS policies isolate data, server-side verification required
5. **Automatic:** Refunds and payouts handled automatically, not manual

---

## 2. Database Schema

### 2.1 New Tables

#### `payments` Table
Tracks every payment transaction.

```sql
CREATE TABLE public.payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  booking_id UUID NOT NULL UNIQUE REFERENCES public.bookings(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  amount DECIMAL(10, 2) NOT NULL,  -- Total amount customer pays
  payment_method TEXT NOT NULL CHECK (payment_method IN ('upi', 'card', 'net_banking', 'cash')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'paid', 'failed', 'refunded')),
  
  -- Payment gateway reference
  gateway_transaction_id TEXT,  -- External payment gateway ID (for mock: uuid)
  gateway_response JSONB,  -- Full gateway response stored for audit
  
  -- Timeline tracking
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  paid_at TIMESTAMPTZ,  -- When payment was successfully processed
  refunded_at TIMESTAMPTZ,  -- When refund was issued
  
  -- Refund tracking
  refund_reason TEXT,  -- 'provider_cancelled', 'customer_cancelled_pre_acceptance', 'customer_dispute'
  refund_amount DECIMAL(10, 2),  -- May be partial refund
  
  -- Idempotency key to prevent duplicate payments
  idempotency_key TEXT UNIQUE,  -- SHA256(booking_id + customer_id + amount + timestamp)
  
  CONSTRAINT amount_positive CHECK (amount > 0)
);

CREATE INDEX idx_payments_booking ON public.payments(booking_id);
CREATE INDEX idx_payments_customer ON public.payments(customer_id);
CREATE INDEX idx_payments_status ON public.payments(status);
CREATE INDEX idx_payments_gateway_transaction ON public.payments(gateway_transaction_id);
CREATE INDEX idx_payments_created ON public.payments(created_at DESC);
```

#### `payment_methods` Table
Stores customer's saved payment methods (optional for v1, can be added later).

```sql
CREATE TABLE public.payment_methods (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  method_type TEXT NOT NULL CHECK (method_type IN ('upi', 'card', 'net_banking')),
  
  -- Tokenized payment details (never store full card/UPI)
  payment_token TEXT NOT NULL,  -- Gateway's token or masked ID
  display_value TEXT NOT NULL,  -- For UI: "Ending in 1234", "user@upi"
  
  is_default BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  UNIQUE (customer_id, payment_token)
);

CREATE INDEX idx_payment_methods_customer ON public.payment_methods(customer_id);
```

#### `provider_earnings` Table
Tracks earnings distribution for each service completion.

```sql
CREATE TABLE public.provider_earnings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  booking_id UUID NOT NULL UNIQUE REFERENCES public.bookings(id) ON DELETE CASCADE,
  provider_id UUID NOT NULL REFERENCES public.service_providers(id) ON DELETE CASCADE,
  payment_id UUID NOT NULL REFERENCES public.payments(id) ON DELETE CASCADE,
  
  -- Amount breakdown
  service_amount DECIMAL(10, 2) NOT NULL,  -- Total service cost (before split)
  platform_fee DECIMAL(10, 2) NOT NULL,  -- Sahaay's commission
  provider_earning DECIMAL(10, 2) NOT NULL,  -- Provider's net earning
  
  -- Payout status
  payout_status TEXT NOT NULL DEFAULT 'pending' CHECK (payout_status IN ('pending', 'processing', 'completed', 'failed')),
  payout_date TIMESTAMPTZ,
  payout_method TEXT,  -- 'bank_transfer', 'upi', 'wallet' (for future)
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  CONSTRAINT earning_positive CHECK (provider_earning > 0),
  CONSTRAINT breakdown_matches CHECK (platform_fee + provider_earning = service_amount)
);

CREATE INDEX idx_provider_earnings_provider ON public.provider_earnings(provider_id);
CREATE INDEX idx_provider_earnings_payout_status ON public.provider_earnings(payout_status);
CREATE INDEX idx_provider_earnings_booking ON public.provider_earnings(booking_id);
```

#### `refunds` Table
Audit trail for all refund transactions.

```sql
CREATE TABLE public.refunds (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  payment_id UUID NOT NULL REFERENCES public.payments(id) ON DELETE CASCADE,
  booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  
  refund_amount DECIMAL(10, 2) NOT NULL,
  refund_reason TEXT NOT NULL,  -- 'provider_cancelled', 'customer_cancelled_pre_acceptance'
  initiated_by TEXT NOT NULL CHECK (initiated_by IN ('system', 'admin', 'customer')),
  
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  gateway_refund_id TEXT,  -- External refund transaction ID
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  
  CONSTRAINT refund_positive CHECK (refund_amount > 0)
);

CREATE INDEX idx_refunds_payment ON public.refunds(payment_id);
CREATE INDEX idx_refunds_booking ON public.refunds(booking_id);
CREATE INDEX idx_refunds_status ON public.refunds(status);
```

### 2.2 Booking Table Changes

Add two columns to existing `bookings` table (backward-compatible):

```sql
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS 
  payment_timing TEXT DEFAULT 'post_service' CHECK (payment_timing IN ('upfront', 'post_service'));

ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS 
  payment_status TEXT DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'failed'));
```

---

## 3. Row-Level Security (RLS) Policies

### 3.1 `payments` Table

```sql
-- Customers can see their own payments
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Customers see own payments" ON public.payments
  FOR SELECT USING (customer_id = auth.uid());

-- Providers can see payments for their bookings
CREATE POLICY "Providers see their booking payments" ON public.payments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.bookings b
      JOIN public.service_providers sp ON sp.id = b.provider_id
      WHERE b.id = payments.booking_id 
        AND sp.user_id = auth.uid()
    )
  );

-- Only system/triggers can insert payments (not users directly)
CREATE POLICY "System inserts payments" ON public.payments
  FOR INSERT WITH CHECK (FALSE);  -- Handled by backend API

-- Only system can update payment status
CREATE POLICY "System updates payment status" ON public.payments
  FOR UPDATE USING (FALSE);  -- Handled by backend API
```

### 3.2 `provider_earnings` Table

```sql
ALTER TABLE public.provider_earnings ENABLE ROW LEVEL SECURITY;

-- Providers see only their own earnings
CREATE POLICY "Providers see own earnings" ON public.provider_earnings
  FOR SELECT USING (provider_id = (
    SELECT id FROM public.service_providers WHERE user_id = auth.uid()
  ));

-- Admins see all earnings
CREATE POLICY "Admins see all earnings" ON public.provider_earnings
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
  );
```

### 3.3 `refunds` Table

```sql
ALTER TABLE public.refunds ENABLE ROW LEVEL SECURITY;

-- Customers see refunds for their payments
CREATE POLICY "Customers see own refunds" ON public.refunds
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.payments p
      WHERE p.id = refunds.payment_id AND p.customer_id = auth.uid()
    )
  );

-- Admins see all refunds
CREATE POLICY "Admins see all refunds" ON public.refunds
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
  );
```

---

## 4. Payment Flow Architecture

### 4.1 Upfront Payment Flow (Before Service)

```
Customer creates booking with payment_timing='upfront'
    ↓
Payment record created with status='pending'
    ↓
Customer directed to payment UI
    ↓
Customer selects payment method (UPI/Card/Net Banking)
    ↓
Backend processes payment via mock gateway
    ↓
Gateway returns success/failure
    ↓
IF SUCCESS:
  - Update payment.status = 'paid'
  - Update bookings.payment_status = 'paid'
  - Create provider_earnings record with status='pending'
  - Return confirmation to customer
    ↓
ELSE (FAILURE):
  - Update payment.status = 'failed'
  - Show error message
  - Customer can retry or use different method
```

### 4.2 Post-Service Payment Flow

```
Customer creates booking with payment_timing='post_service'
    ↓
Booking confirmed with provider
    ↓
Service completed
    ↓
Payment reminder sent to customer
    ↓
Customer navigates to payment UI
    ↓
Customer selects payment method (UPI/Card/Net Banking/Cash)
    ↓
IF CASH:
  - Payment.status = 'pending'
  - Provider marks cash as received
  - Payment.status = 'paid'
    ↓
ELSE (DIGITAL):
  - Backend processes payment via mock gateway
  - IF SUCCESS: payment.status = 'paid', create provider_earnings
  - ELSE: payment.status = 'failed', retry option
```

### 4.3 Auto-Refund Flow

```
Refund Trigger 1: Provider Cancels
  Booking.status = 'cancelled' AND cancelled_by = 'provider'
    ↓
  IF payment.status = 'paid':
    - Create refund record with reason='provider_cancelled'
    - Process refund through payment gateway
    - Update payment.status = 'refunded'
    - Debit provider_earnings (mark as 'refund_pending')
    ↓
Refund Trigger 2: Customer Cancels Before Any Provider Accepts
  Booking.status = 'broadcast' → 'cancelled' (no provider accepted)
    ↓
  IF payment.status = 'paid':
    - Create refund record with reason='customer_cancelled_pre_acceptance'
    - Process refund through payment gateway
    - Update payment.status = 'refunded'
    ↓
ELSE (After provider accepted):
  - No automatic refund (customer must dispute or negotiated cancellation)
```

### 4.4 Provider Payout Flow

```
Service completed + payment received
    ↓
Create provider_earnings record (status='pending')
    ↓
Scheduled job runs (nightly or per-booking):
  - Collect all pending provider_earnings for user
  - Calculate total payout amount
  - Create payout transaction
  - Update provider_earnings.payout_status = 'completed'
  - Mark in admin dashboard as 'Paid Out'
    ↓
Provider can view earnings history in dashboard
```

---

## 5. API Endpoints (Backend)

All endpoints are server-side (not called directly from frontend):

### 5.1 Payment Processing

**POST `/api/payments/create`**
- Creates payment record for a booking
- Validates booking exists, customer is owner, no duplicate payment exists
- Returns: `{ paymentId, amount, bookingId }`

**POST `/api/payments/process`**
- Processes payment through mock gateway
- Validates idempotency key
- Updates payment status
- Triggers provider_earnings creation on success
- Returns: `{ status, paymentId, transactionId }`

**POST `/api/payments/verify`**
- Server-side verification (called by frontend after payment gateway returns)
- Confirms payment status with gateway
- Prevents duplicate charge if frontend retries
- Returns: `{ verified: boolean, status }`

### 5.2 Refund Processing

**POST `/api/refunds/process`**
- Triggered by booking cancellation logic
- Creates refund record
- Processes refund through gateway
- Updates payment and earnings status
- Returns: `{ refundId, status }`

### 5.3 Provider Earnings

**GET `/api/provider/earnings`**
- Returns earnings history with filters (date range, booking, status)
- Returns: `[{ bookingId, amount, platformFee, providerEarning, payoutStatus, payoutDate }]`

**GET `/api/provider/earnings/summary`**
- Returns total pending earnings, total paid this month, next payout date
- Returns: `{ pendingEarnings, paidThisMonth, totalAllTime, nextPayoutDate }`

### 5.4 Admin Payment Management

**GET `/api/admin/payments`**
- List all payments with filters (status, date range, customer, provider)
- Returns paginated results

**GET `/api/admin/refunds`**
- List all refunds with status tracking
- Returns: `[{ refundId, paymentId, amount, reason, status, createdAt }]`

**POST `/api/admin/payouts/trigger`**
- Manually trigger provider payouts (for testing or missed batches)
- Returns: `{ payoutIds, totalAmount, affectedProviders }`

---

## 6. Frontend Components

### 6.1 Customer-Facing

**PaymentMethodSelector**
- Radio buttons for UPI, Card, Net Banking, Cash on Service
- Shows saved methods (if any) with option to add new
- Conditional rendering based on payment_timing

**PaymentCheckout**
- Shows amount breakdown: Service Amount → Platform Fee + Provider Earning
- Input fields for payment method details
- "Pay Now" button triggers backend payment processing
- Loading state during payment
- Success/error messages with retry option

**PaymentHistory**
- Table of all customer's payments with status badges
- Filter by date range, status
- Shows: Booking ID, Service, Amount, Status, Date, Action (view receipt)

**Receipt Modal**
- Confirmation after payment
- Shows breakdown and transaction ID
- Print/download option

### 6.2 Provider-Facing

**EarningsOverview**
- Hero cards: Total Earnings (all-time), Pending Payout, Paid This Month
- Next payout date + amount

**EarningsList**
- Table of all completed services with payment status
- Shows: Booking → Customer, Amount, Platform Fee, Provider Earning, Payout Date
- Filter by date, status (pending/paid)

**PayoutHistory**
- Timeline of all payouts received
- Shows payout date, amount, method, transaction ID

### 6.3 Admin-Facing

**PaymentDashboard**
- Overview: Total Volume, Success Rate, Failed Payments count
- Charts: Daily payment volume, payment method distribution

**PaymentManagement**
- List all payments with columns: Booking, Customer, Provider, Amount, Status, Date
- Bulk actions: Mark as paid, initiate refund, retry payment

**RefundManagement**
- List all refunds: Refund ID, Payment, Amount, Reason, Status
- Quick action buttons: Complete refund, dispute, update status

**PayoutManagement**
- List provider payouts: Provider, Amount, Date, Status
- Manual payout trigger button
- CSV export of payout history

---

## 7. Mock Payment Gateway Implementation

### Behavior
- Simulates Razorpay API (can be swapped later)
- ~95% success rate (5% random failures for testing)
- Instant response (no real processing)
- Returns transaction ID (UUID)
- Full response stored in `gateway_response` JSONB

### Request Format
```typescript
{
  orderId: string;        // booking_id
  amount: number;         // in paise
  currency: 'INR';
  customer: {
    id: string;           // customer_id
    email: string;
    contact: string;      // phone
  };
  method: 'upi' | 'card' | 'netbanking';
  upi_id?: string;
  card?: { last4: string };
  receipt: string;        // idempotency_key
}
```

### Response Format
```typescript
{
  id: string;              // transaction_id (UUID)
  entity: 'payment';
  status: 'captured' | 'failed';
  amount: number;
  currency: 'INR';
  receipt: string;
  created_at: number;      // Unix timestamp
}
```

---

## 8. Security Considerations

### 8.1 Payment Processing
- **Idempotency:** SHA256(booking_id + customer_id + amount + timestamp) prevents duplicate charges
- **Verification:** Server-side verify endpoint confirms payment before marking as paid
- **No direct card/UPI:** Frontend never sees raw payment details (uses gateway tokens)
- **RLS:** Customers see only their payments, providers see only their bookings' payments

### 8.2 Refund Handling
- **Automatic triggers only:** Refunds triggered only by booking cancellation, not user request
- **Audit trail:** Every refund logged with reason and initiator
- **Partial refund support:** For future manual adjustments (not v1)

### 8.3 Provider Earnings
- **Immutable:** provider_earnings created once, cannot be modified
- **Automated payout:** No manual transfer = no fraud opportunity
- **Calculation checks:** Database constraint ensures platform_fee + provider_earning = service_amount

---

## 9. Data Validation Rules

### Payments Table
- `amount > 0`
- `status` transitions: pending → processing → (paid OR failed) → refunded
- `paid_at` required if status = 'paid'
- `refunded_at` required if status = 'refunded'
- `idempotency_key` must be unique (prevents duplicates)
- `gateway_transaction_id` required if status = 'paid'

### Provider Earnings Table
- `provider_earning + platform_fee = service_amount`
- `payout_status` transitions: pending → processing → completed OR failed
- Cannot be created without successful payment

### Refunds Table
- `refund_amount ≤ payment.amount` (partial refund support)
- `initiated_by` must be 'system', 'admin', or 'customer'
- `status` transitions: pending → processing → completed OR failed

---

## 10. Error Handling

### Payment Failures
1. **Gateway timeout:** Mark as 'failed', show "Please try again"
2. **Insufficient funds:** Mark as 'failed', show "Insufficient balance"
3. **Invalid payment method:** Mark as 'failed', show "Invalid card/UPI"
4. **Duplicate payment attempt:** Check idempotency key, return existing payment status
5. **Network error:** Retry with exponential backoff

### Refund Failures
1. **Gateway refund rejected:** Mark refund as 'failed', alert admin
2. **Partial refund:** Supported, allow admin to adjust amount
3. **Refund timeout:** Retry with scheduled job

---

## 11. Testing Strategy

### Unit Tests
- Payment creation validation
- Refund trigger logic
- Earnings calculation
- Idempotency key generation

### Integration Tests
- End-to-end upfront payment flow
- End-to-end post-service flow
- Auto-refund on provider cancellation
- Auto-refund on customer pre-acceptance cancellation
- Provider earning creation + payout

### Manual Testing Scenarios
1. Successful UPI payment → Verify payment status + earnings created
2. Failed card payment → Verify error shown, no earnings created
3. Provider cancels after paid → Verify refund processed automatically
4. Customer cancels before acceptance → Verify refund processed automatically
5. Customer cancels after acceptance → Verify no automatic refund
6. Daily payout job → Verify provider earnings marked as paid out

---

## 12. Implementation Order

1. **Phase 1 (Core):** Database schema + RLS policies + API endpoints
2. **Phase 2 (Processing):** Mock gateway + payment processing flow
3. **Phase 3 (UI):** Customer payment checkout + payment history
4. **Phase 4 (Provider):** Earnings dashboard + payout history
5. **Phase 5 (Admin):** Payment management dashboard + refund management
6. **Phase 6 (Automation):** Refund triggers + payout job scheduler

---

## 13. Future Enhancements (Post-MVP)

- Real Razorpay/Stripe integration (swap mock gateway)
- Saved payment methods (v2)
- Partial refunds (v2)
- Subscription-based pricing (v2)
- Wallet/prepaid balance (v2)
- Multiple payout methods (bank, UPI, wallet)
- Payment analytics dashboard
- Tax report generation for providers

---

## 14. Rollback Plan

If issues occur:
1. Disable payment creation at API level (return 503)
2. Revert to cash-only flow
3. Admins manually process refunds for failed payments
4. No data loss (all tables preserved)

---

## Document Information

**Author:** Claude  
**Last Updated:** 2026-09-26  
**Status:** Ready for Implementation Plan  
**Approval:** Pending User Review