-- ============================================================
-- Sahaay — Migration 0014: Add DELETE RLS Policy for Bookings
-- Run this in the Supabase SQL editor to allow customers to delete their requests
-- https://supabase.com/dashboard/project/fzefnqmpmzcdmkmjkagw/sql
-- ============================================================

-- Add DELETE policy for bookings table
-- This allows customers to delete their own pending/unassigned requests
-- Also allows providers and admins to delete bookings they're involved in

drop policy if exists "Participants delete bookings" on public.bookings;

create policy "Participants delete bookings"
  on public.bookings for delete
  using (
    auth.uid() = customer_id
    or auth.uid() in (select user_id from public.service_providers where id = provider_id)
    or exists (select 1 from public.users where id = auth.uid() and role = 'admin')
  );

-- Grant delete permissions
grant delete on public.bookings to authenticated;
