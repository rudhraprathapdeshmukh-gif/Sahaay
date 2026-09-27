-- Add latitude and longitude columns to bookings table for geolocation-based matching
-- This enables the 15km radius filtering feature for providers

ALTER TABLE public.bookings
ADD COLUMN IF NOT EXISTS latitude DECIMAL(10, 8),
ADD COLUMN IF NOT EXISTS longitude DECIMAL(11, 8);

-- Add comment for documentation
COMMENT ON COLUMN public.bookings.latitude IS 'Customer location latitude for geolocation-based provider matching (15km radius)';
COMMENT ON COLUMN public.bookings.longitude IS 'Customer location longitude for geolocation-based provider matching (15km radius)';

-- Optional: Add a spatial index if PostGIS is available (improves distance query performance)
-- This would require PostGIS extension to be enabled first
-- CREATE INDEX IF NOT EXISTS idx_bookings_location ON public.bookings USING gist(ll_to_earth(latitude, longitude));
