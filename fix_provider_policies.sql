-- ============================================================
-- Sahaay — Complete Fix for Provider Policies
-- Copy and paste this into Supabase SQL Editor
-- https://supabase.com/dashboard/project/fzefnqmpmzcdmkmjkagw/sql
-- ============================================================

-- Step 1: Fix SELECT policy (allows providers to SEE broadcast requests)
DROP POLICY IF EXISTS "Public read bookings for participants" ON public.bookings;

CREATE POLICY "Public read bookings for participants"
  ON public.bookings FOR SELECT
  USING (
    -- Customer can see their own bookings
    auth.uid() = customer_id
    -- Provider can see bookings assigned to them
    OR EXISTS (
      SELECT 1 FROM public.service_providers sp
      WHERE sp.user_id = auth.uid() AND sp.id = provider_id
    )
    -- Provider can see broadcast requests for their service (KEY FIX)
    OR EXISTS (
      SELECT 1 FROM public.service_providers sp
      WHERE sp.user_id = auth.uid()
        AND sp.service_id = bookings.service_id
        AND bookings.status = 'broadcast'
        AND bookings.provider_id IS NULL
    )
    -- Admin can see everything
    OR EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
  );

-- Step 2: Fix UPDATE policy (allows providers to ACCEPT broadcast requests)
DROP POLICY IF EXISTS "Participants update bookings" ON public.bookings;

CREATE POLICY "Participants update bookings"
  ON public.bookings FOR UPDATE
  USING (
    -- Customer can update their own bookings
    auth.uid() = customer_id
    -- Provider can update bookings assigned to them
    OR EXISTS (
      SELECT 1 FROM public.service_providers sp
      WHERE sp.user_id = auth.uid() AND sp.id = provider_id
    )
    -- Provider can accept broadcast requests (KEY FIX)
    OR EXISTS (
      SELECT 1 FROM public.service_providers sp
      WHERE sp.user_id = auth.uid()
        AND sp.service_id = bookings.service_id
        AND bookings.status = 'broadcast'
        AND bookings.provider_id IS NULL
    )
    -- Admin can update everything
    OR EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
  )
  WITH CHECK (
    -- Ensure after update, provider_id matches the updating provider
    auth.uid() = customer_id
    OR EXISTS (
      SELECT 1 FROM public.service_providers sp
      WHERE sp.user_id = auth.uid() AND sp.id = provider_id
    )
    OR EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
  );

-- Success message
SELECT '✅ Policies updated! Providers can now see and accept broadcast requests.' AS status;
