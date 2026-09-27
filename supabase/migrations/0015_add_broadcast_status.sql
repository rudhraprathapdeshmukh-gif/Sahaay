-- ============================================================
-- Sahaay — Migration 0015: Add 'broadcast' Status to Bookings
-- Run this in the Supabase SQL editor to add the new status
-- https://supabase.com/dashboard/project/fzefnqmpmzcdmkmjkagw/sql
-- ============================================================

-- Drop the existing check constraint
ALTER TABLE public.bookings DROP CONSTRAINT IF EXISTS bookings_status_check;

-- Add the new check constraint with 'broadcast' status
ALTER TABLE public.bookings ADD CONSTRAINT bookings_status_check
  CHECK (status IN ('broadcast', 'confirmed', 'in_progress', 'completed', 'cancelled'));

-- Update any existing 'pending' status bookings to 'broadcast' (optional, if there are any)
UPDATE public.bookings SET status = 'broadcast' WHERE status = 'pending';
