-- Migration to make provider_id nullable in bookings table
-- to support unassigned pool model
ALTER TABLE public.bookings ALTER COLUMN provider_id DROP NOT NULL;
