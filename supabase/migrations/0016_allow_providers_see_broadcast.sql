-- ============================================================
-- Sahaay — Migration 0016: Allow Providers to See Broadcast Requests
-- Run this in the Supabase SQL editor
-- https://supabase.com/dashboard/project/fzefnqmpmzcdmkmjkagw/sql
-- ============================================================

-- Current policy: Providers can only see bookings WHERE id = provider_id
-- This means they can't see broadcast requests (provider_id is null)

-- Add new policy: Providers can see broadcast requests matching their service
create or replace function public.can_provider_see_broadcast(provider_uuid uuid)
returns boolean as $$
  exists (
    select 1 from public.service_providers sp
    where sp.id = provider_uuid
  )
$$ language sql;

-- Create policy to allow providers to see broadcast requests (unassigned requests)
drop policy if exists "Providers see broadcast requests" on public.bookings;
create policy "Providers see broadcast requests"
  on public.bookings for select
  using (
    -- Customer can always see their own bookings
    auth.uid() = customer_id
    -- Provider can see their assigned bookings
    or exists (
      select 1 from public.service_providers sp
      where sp.user_id = auth.uid() and sp.id = provider_id
    )
    -- Provider can see broadcast requests for their service type
    -- (This is the key fix for on-demand matching)
    or exists (
      select 1 from public.service_providers sp
      where sp.user_id = auth.uid()
        and sp.service_id = bookings.service_id
        and bookings.status = 'broadcast'
        and bookings.provider_id is null
    )
    or exists (select 1 from public.users where id = auth.uid() and role = 'admin')
  );