-- ============================================================
-- Sahaay — Simple Fix for Provider Accept/Reject
-- Copy and paste this ENTIRE block into Supabase SQL Editor
-- https://supabase.com/dashboard/project/fzefnqmpmzcdmkmjkagw/sql
-- ============================================================

-- Step 1: Drop the old policy (force drop)
DROP POLICY "Participants update bookings" ON public.bookings;

-- Step 2: Create the new policy with broadcast support
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
    -- Provider can accept broadcast requests (THIS IS THE KEY FIX)
    OR EXISTS (
      SELECT 1 FROM public.service_providers sp
      WHERE sp.user_id = auth.uid()
        AND sp.service_id = bookings.service_id
        AND bookings.status = 'broadcast'
        AND bookings.provider_id IS NULL
    )
    OR EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
  )
  WITH CHECK (
    auth.uid() = customer_id
    OR EXISTS (
      SELECT 1 FROM public.service_providers sp
      WHERE sp.user_id = auth.uid() AND sp.id = provider_id
    )
    OR EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
  );

-- Success message
SELECT 'Migration complete! Providers can now accept broadcast requests.' AS status;
