-- ============================================================
-- Sahaay — Migration 0018: Update UPDATE Policy for Broadcast Requests
-- This migration adds support for providers to accept broadcast requests
-- Run this in the Supabase SQL editor
-- https://supabase.com/dashboard/project/fzefnqmpmzcdmkmjkagw/sql
-- ============================================================

-- Check if the policy exists, and drop it if it does
do $$
declare
  policy_exists boolean;
begin
  select exists (
    select 1 from pg_policies where tablename = 'bookings'
    and policyname = 'Participants update bookings'
  ) into policy_exists;

  if policy_exists then
    execute 'drop policy "Participants update bookings" on public.bookings';
  end if;
end $$;

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
  -- WITH CHECK ensures providers can only set their own provider_id when accepting
  with check (
    auth.uid() = customer_id
    or exists (
      select 1 from public.service_providers sp
      where sp.user_id = auth.uid() and sp.id = provider_id
    )
    or exists (
      select 1 from public.service_providers sp
      where sp.user_id = auth.uid()
        and sp.service_id = bookings.service_id
        and bookings.status = 'broadcast'
        and bookings.provider_id is null
    )
    or exists (select 1 from public.users where id = auth.uid() and role = 'admin')
  );
