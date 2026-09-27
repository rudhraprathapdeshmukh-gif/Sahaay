-- ============================================================
-- Sahaay — Complete Provider Policy Fix
-- Copy and paste this ENTIRE script into Supabase SQL Editor
-- This fixes both SELECT and UPDATE policies for broadcast requests
-- https://supabase.com/dashboard/project/fzefnqmpmzcdmkmjkagw/sql
-- ============================================================

-- ═══════════════════════════════════════════════════════════
-- STEP 1: Check what policies currently exist
-- ═══════════════════════════════════════════════════════════

SELECT
  schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies
WHERE tablename = 'bookings'
ORDER BY policyname;

-- ═══════════════════════════════════════════════════════════
-- STEP 2: Remove existing conflicting policies
-- ═══════════════════════════════════════════════════════════

-- Drop SELECT policy
DROP POLICY IF EXISTS "Public read bookings for participants" ON public.bookings;

-- Drop UPDATE policy
DROP POLICY IF EXISTS "Participants update bookings" ON public.bookings;

-- ═══════════════════════════════════════════════════════════
-- STEP 3: Create new SELECT policy (allows providers to SEE broadcast requests)
-- ═══════════════════════════════════════════════════════════

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
    -- ★ KEY FIX: Provider can see broadcast requests for their service type
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

-- ═══════════════════════════════════════════════════════════
-- STEP 4: Create new UPDATE policy (allows providers to ACCEPT broadcast requests)
-- ═══════════════════════════════════════════════════════════

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
    -- ★ KEY FIX: Provider can accept broadcast requests
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
  -- WITH CHECK: Validates the data AFTER update
  WITH CHECK (
    -- Customer can update their own bookings
    auth.uid() = customer_id
    -- Provider can only update if provider_id matches them AFTER update
    OR EXISTS (
      SELECT 1 FROM public.service_providers sp
      WHERE sp.user_id = auth.uid() AND sp.id = provider_id
    )
    -- Admin can update everything
    OR EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
  );

-- ═══════════════════════════════════════════════════════════
-- STEP 5: Verify the policies are created correctly
-- ═══════════════════════════════════════════════════════════

SELECT
  policyname,
  cmd,
  CASE
    WHEN qual LIKE '%broadcast%' THEN '✅ Includes broadcast support'
    ELSE '❌ Missing broadcast support'
  END as status
FROM pg_policies
WHERE tablename = 'bookings'
  AND policyname IN ('Public read bookings for participants', 'Participants update bookings');

-- ═══════════════════════════════════════════════════════════
-- SUCCESS MESSAGE
-- ═══════════════════════════════════════════════════════════

SELECT '🎉 Migration complete! Providers can now see and accept broadcast requests.' AS message;
