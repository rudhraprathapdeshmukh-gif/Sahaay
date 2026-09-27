-- Migration: Add latitude and longitude columns to bookings table
-- Run this in your Supabase SQL Editor

ALTER TABLE bookings
ADD COLUMN IF NOT EXISTS latitude double precision,
ADD COLUMN IF NOT EXISTS longitude double precision;

-- Add indexes for faster location-based queries
CREATE INDEX IF NOT EXISTS idx_bookings_latitude ON bookings(latitude) WHERE latitude IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_bookings_longitude ON bookings(longitude) WHERE longitude IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_bookings_location ON bookings(latitude, longitude) WHERE latitude IS NOT NULL AND longitude IS NOT NULL;

-- Add comments for documentation
COMMENT ON COLUMN bookings.latitude IS 'Customer location latitude from GPS';
COMMENT ON COLUMN bookings.longitude IS 'Customer location longitude from GPS';