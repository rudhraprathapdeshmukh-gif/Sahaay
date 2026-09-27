-- =============================================================
-- Sahaay -- Add unique constraint to phone number
-- =============================================================

-- Add unique constraint to phone column in users table
-- This ensures one phone number can only belong to one account
-- Works for both customer and provider roles

-- First, check if there are any duplicate phone numbers that would violate the constraint
-- If there are duplicates, we need to handle them before adding the constraint
DO $$
DECLARE
    duplicate_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO duplicate_count
    FROM (
        SELECT phone, COUNT(*) as cnt
        FROM public.users
        WHERE phone IS NOT NULL
        GROUP BY phone
        HAVING COUNT(*) > 1
    ) duplicates;

    IF duplicate_count > 0 THEN
        RAISE EXCEPTION 'Cannot add unique constraint to phone column: % duplicate phone numbers found. Please clean up duplicates first.', duplicate_count;
    END IF;
END $$;

-- Add unique constraint to phone column (allowing NULL values to have multiple NULLs)
-- We use a partial index to only constrain non-null values
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_phone_unique ON public.users(phone) WHERE phone IS NOT NULL;

-- Also, let's add a comment to document this constraint
COMMENT ON INDEX idx_users_phone_unique IS 'Ensures each phone number is associated with at most one account (excluding NULL values)';