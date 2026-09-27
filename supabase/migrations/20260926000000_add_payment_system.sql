-- =============================================================
-- Sahaay Payment System Migration
-- Run this in the Supabase SQL editor or via `supabase db push`
-- =============================================================

-- Enable required extensions
create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

-- ── PAYMENTS TABLE ─────────────────────────────────────────────
CREATE TABLE public.payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  booking_id UUID NOT NULL UNIQUE REFERENCES public.bookings(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  amount DECIMAL(10, 2) NOT NULL,
  payment_method TEXT NOT NULL CHECK (payment_method IN ('upi', 'card', 'net_banking', 'cash')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'paid', 'failed', 'refunded')),
  gateway_transaction_id TEXT,
  gateway_response JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  paid_at TIMESTAMPTZ,
  refunded_at TIMESTAMPTZ,
  refund_reason TEXT CHECK (refund_reason IN ('provider_cancelled', 'customer_cancelled_pre_acceptance', 'customer_dispute')),
  refund_amount DECIMAL(10, 2),
  idempotency_key TEXT UNIQUE,
  CONSTRAINT amount_positive CHECK (amount > 0)
);

-- ── PROVIDER EARNINGS TABLE ─────────────────────────────────────
CREATE TABLE public.provider_earnings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  booking_id UUID NOT NULL UNIQUE REFERENCES public.bookings(id) ON DELETE CASCADE,
  provider_id UUID NOT NULL REFERENCES public.service_providers(id) ON DELETE CASCADE,
  payment_id UUID NOT NULL REFERENCES public.payments(id) ON DELETE CASCADE,
  service_amount DECIMAL(10, 2) NOT NULL,
  platform_fee DECIMAL(10, 2) NOT NULL,
  provider_earning DECIMAL(10, 2) NOT NULL,
  payout_status TEXT NOT NULL DEFAULT 'pending' CHECK (payout_status IN ('pending', 'processing', 'completed', 'failed')),
  payout_date TIMESTAMPTZ,
  payout_method TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT earning_positive CHECK (provider_earning > 0),
  CONSTRAINT breakdown_matches CHECK (platform_fee + provider_earning = service_amount)
);

-- ── REFUNDS TABLE ──────────────────────────────────────────────
CREATE TABLE public.refunds (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  payment_id UUID NOT NULL REFERENCES public.payments(id) ON DELETE CASCADE,
  booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  refund_amount DECIMAL(10, 2) NOT NULL,
  refund_reason TEXT NOT NULL CHECK (refund_reason IN ('provider_cancelled', 'customer_cancelled_pre_acceptance', 'customer_dispute')),
  initiated_by TEXT NOT NULL CHECK (initiated_by IN ('system', 'admin', 'customer')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  gateway_refund_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  CONSTRAINT refund_positive CHECK (refund_amount > 0)
);

-- ── INDEXES ───────────────────────────────────────────────────
CREATE INDEX idx_payments_booking ON public.payments(booking_id);
CREATE INDEX idx_payments_customer ON public.payments(customer_id);
CREATE INDEX idx_payments_status ON public.payments(status);
CREATE INDEX idx_payments_created ON public.payments(created_at DESC);

CREATE INDEX idx_provider_earnings_provider ON public.provider_earnings(provider_id);
CREATE INDEX idx_provider_earnings_payout_status ON public.provider_earnings(payout_status);
CREATE INDEX idx_provider_earnings_booking ON public.provider_earnings(booking_id);

CREATE INDEX idx_refunds_payment ON public.refunds(payment_id);
CREATE INDEX idx_refunds_status ON public.refunds(status);

-- ── BOOKING TABLE UPDATES ──────────────────────────────────────
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS
  payment_timing TEXT DEFAULT 'post_service' CHECK (payment_timing IN ('upfront', 'post_service'));

ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS
  payment_status TEXT DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'failed'));

-- ── ROW LEVEL SECURITY POLICIES ───────────────────────────────
-- Payments RLS
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Customers see own payments" ON public.payments
  FOR SELECT USING (customer_id = auth.uid());

CREATE POLICY "Providers see their booking payments" ON public.payments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.bookings b
      JOIN public.service_providers sp ON sp.id = b.provider_id
      WHERE b.id = payments.booking_id
        AND sp.user_id = auth.uid()
    )
  );

CREATE POLICY "Admins see all payments" ON public.payments
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
  );

-- Provider earnings RLS
ALTER TABLE public.provider_earnings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Providers see own earnings" ON public.provider_earnings
  FOR SELECT USING (provider_id = (
    SELECT id FROM public.service_providers WHERE user_id = auth.uid()
  ));

CREATE POLICY "Admins see all earnings" ON public.provider_earnings
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
  );

-- Refunds RLS
ALTER TABLE public.refunds ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Customers see own refunds" ON public.refunds
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.payments p
      WHERE p.id = refunds.payment_id AND p.customer_id = auth.uid()
    )
  );

CREATE POLICY "Admins see all refunds" ON public.refunds
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
  );