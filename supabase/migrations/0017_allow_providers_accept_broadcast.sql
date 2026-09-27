-- ============================================================
-- Sahaay — Migration 0017: Allow Providers to Accept Broadcast Requests
-- Run this in the Supabase SQL editor
-- https://supabase.com/dashboard/project/fzefnqmpmzcdmkmjkagw/sql
-- ============================================================

-- Drop the existing UPDATE policy
drop policy if exists "Participants update bookings" on public.bookings;

-- Create new UPDATE policy that allows providers to accept broadcast requests
create policy "Participants update bookings"
  on public.bookings for update
  using (
    -- Customer can update their own bookings
    auth.uid() = customer_id
    -- Provider can update bookings assigned to them
    or exists (
      select 1 from public.service_providers sp
      where sp.user_id = auth.uid() and sp.id = provider_id
    )
    -- Provider can accept broadcast requests (set provider_id and status)
    or exists (
      select 1 from public.service_providers sp
      where sp.user_id = auth.uid()
        and sp.service_id = bookings.service_id
        and bookings.status = 'broadcast'
        and bookings.provider_id is null
    )
    or exists (select 1 from public.users where id = auth.uid() and role = 'admin')
  )
  -- Add WITH CHECK to ensure providers can only set their own provider_id
  with check (
    auth.uid() = customer_id
    or exists (
      select 1 from public.service_providers sp
      where sp.user_id = auth.uid() and sp.id = provider_id
    )
    or exists (select 1 from public.users where id = auth.uid() and role = 'admin')
  );