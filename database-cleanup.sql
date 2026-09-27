-- Sahaay Database Cleanup Script
-- This SQL script removes all fake/placeholder data from your database
-- IMPORTANT: Run a backup BEFORE executing this script!

-- STEP 1: Identify and delete fake provider_skills associations
DELETE FROM provider_skills
WHERE provider_id IN (
  SELECT sp.id
  FROM service_providers sp
  JOIN users u ON sp.user_id = u.id
  WHERE
    -- Fake user patterns
    u.email ILIKE '%test@%' OR u.email ILIKE '%demo@%' OR
    u.email ILIKE '%fake@%' OR u.email ILIKE '%placeholder@%' OR
    u.email ILIKE '%dummy@%' OR u.email ILIKE '%example@%' OR
    u.email ILIKE '%sample@%' OR u.email ILIKE '%@localhost%' OR
    LOWER(u.full_name) LIKE '%test user%' OR LOWER(u.full_name) LIKE '%demo user%' OR
    LOWER(u.full_name) LIKE '%john doe%' OR LOWER(u.full_name) LIKE '%jane doe%' OR
    LOWER(u.full_name) LIKE '%admin%' OR LOWER(u.full_name) LIKE '%placeholder%' OR
    LOWER(u.full_name) LIKE '%sample%' OR LOWER(u.full_name) LIKE '%dummy%' OR
    -- Fake provider bios
    LOWER(sp.bio) LIKE '%test bio%' OR LOWER(sp.bio) LIKE '%demo bio%' OR
    LOWER(sp.bio) LIKE '%placeholder bio%' OR LOWER(sp.bio) LIKE '%sample bio%' OR
    LOWER(sp.bio) LIKE '%lorem ipsum%'
);

-- STEP 2: Delete bookings from fake users
DELETE FROM bookings
WHERE customer_id IN (
  SELECT id FROM users
  WHERE
    email ILIKE '%test@%' OR email ILIKE '%demo@%' OR
    email ILIKE '%fake@%' OR email ILIKE '%placeholder@%' OR
    email ILIKE '%dummy@%' OR email ILIKE '%example@%' OR
    email ILIKE '%sample@%' OR email ILIKE '%@localhost%' OR
    LOWER(full_name) LIKE '%test user%' OR LOWER(full_name) LIKE '%demo user%' OR
    LOWER(full_name) LIKE '%john doe%' OR LOWER(full_name) LIKE '%jane doe%' OR
    LOWER(full_name) LIKE '%admin%' OR LOWER(full_name) LIKE '%placeholder%' OR
    LOWER(full_name) LIKE '%sample%' OR LOWER(full_name) LIKE '%dummy%'
)
OR provider_id IN (
  SELECT sp.id FROM service_providers sp
  JOIN users u ON sp.user_id = u.id
  WHERE
    LOWER(sp.bio) LIKE '%test bio%' OR LOWER(sp.bio) LIKE '%demo bio%' OR
    LOWER(sp.bio) LIKE '%placeholder bio%' OR LOWER(sp.bio) LIKE '%sample bio%' OR
    LOWER(sp.bio) LIKE '%lorem ipsum%'
);

-- STEP 3: Delete fake service providers
DELETE FROM service_providers
WHERE user_id IN (
  SELECT id FROM users
  WHERE
    email ILIKE '%test@%' OR email ILIKE '%demo@%' OR
    email ILIKE '%fake@%' OR email ILIKE '%placeholder@%' OR
    email ILIKE '%dummy@%' OR email ILIKE '%example@%' OR
    email ILIKE '%sample@%' OR email ILIKE '%@localhost%' OR
    LOWER(full_name) LIKE '%test user%' OR LOWER(full_name) LIKE '%demo user%' OR
    LOWER(full_name) LIKE '%john doe%' OR LOWER(full_name) LIKE '%jane doe%' OR
    LOWER(full_name) LIKE '%admin%' OR LOWER(full_name) LIKE '%placeholder%' OR
    LOWER(full_name) LIKE '%sample%' OR LOWER(full_name) LIKE '%dummy%'
)
OR id IN (
  SELECT id FROM service_providers
  WHERE
    LOWER(bio) LIKE '%test bio%' OR LOWER(bio) LIKE '%demo bio%' OR
    LOWER(bio) LIKE '%placeholder bio%' OR LOWER(bio) LIKE '%sample bio%' OR
    LOWER(bio) LIKE '%lorem ipsum%'
);

-- STEP 4: Delete fake users
DELETE FROM users
WHERE
  email ILIKE '%test@%' OR email ILIKE '%demo@%' OR
  email ILIKE '%fake@%' OR email ILIKE '%placeholder@%' OR
  email ILIKE '%dummy@%' OR email ILIKE '%example@%' OR
  email ILIKE '%sample@%' OR email ILIKE '%@localhost%' OR
  LOWER(full_name) LIKE '%test user%' OR LOWER(full_name) LIKE '%demo user%' OR
  LOWER(full_name) LIKE '%john doe%' OR LOWER(full_name) LIKE '%jane doe%' OR
  LOWER(full_name) LIKE '%admin%' OR LOWER(full_name) LIKE '%placeholder%' OR
  LOWER(full_name) LIKE '%sample%' OR LOWER(full_name) LIKE '%dummy%' OR
  LOWER(city) LIKE '%test city%' OR LOWER(city) LIKE '%demo city%' OR
  LOWER(city) LIKE '%sample city%' OR LOWER(city) LIKE '%placeholder%' OR
  LOWER(phone) IN ('1234567890', '9999999999', '0000000000', '5555555555') OR
  phone ILIKE '%test%' OR phone ILIKE '%demo%' OR phone ILIKE '%placeholder%';

-- View results
SELECT
  'Cleanup complete!' as status,
  (SELECT COUNT(*) FROM users) as remaining_users,
  (SELECT COUNT(*) FROM service_providers) as remaining_providers,
  (SELECT COUNT(*) FROM bookings) as remaining_bookings;