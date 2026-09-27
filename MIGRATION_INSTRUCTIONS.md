# ⚠️ URGENT: Apply Database Migration

## Problem
Provider registration is failing with "Registration failed. Please check your details and try again."

## Root Cause
The migration `0006_provider_extra_fields.sql` was never applied to your remote Supabase project at `https://fzefnqmpmzcdmkmjkagw.supabase.co`.

The following columns are missing:
- **users table**: `first_name`, `last_name`, `dob`
- **service_providers table**: `availability`, `profile_photo_url`, `certificate_url`, `latitude`, `longitude`
- **Storage buckets**: `provider-photos`, `provider-certificates` with policies

## Solution

### Step 1: Open Supabase Dashboard SQL Editor
1. Go to https://supabase.com/dashboard
2. Select your project: `fzefnqmpmzcdmkmjkagw`
3. Click **SQL Editor** in the left sidebar

### Step 2: Run the Migration
Copy and paste the entire contents of `D:\Sahaay\supabase\migrations\0006_provider_extra_fields.sql` into the SQL Editor and click **Run**.

Or copy this directly:

```sql
-- Add new columns to users table
alter table public.users
  add column if not exists first_name text,
  add column if not exists last_name text,
  add column if not exists dob text;

-- Add new columns to service_providers table
alter table public.service_providers
  add column if not exists availability text[] default '{}',
  add column if not exists profile_photo_url text,
  add column if not exists certificate_url text,
  add column if not exists latitude numeric,
  add column if not exists longitude numeric;

-- Create storage buckets for provider uploads
insert into storage.buckets (id, name, public)
values 
  ('provider-photos', 'provider-photos', true),
  ('provider-certificates', 'provider-certificates', false)
on conflict (id) do nothing;

-- Storage policies for provider-photos (public bucket)
create policy "Anyone can view provider photos"
  on storage.objects for select
  using (bucket_id = 'provider-photos');

create policy "Authenticated users can upload provider photos"
  on storage.objects for insert
  with check (
    bucket_id = 'provider-photos' 
    and auth.role() = 'authenticated'
  );

create policy "Users can update their own provider photos"
  on storage.objects for update
  using (
    bucket_id = 'provider-photos' 
    and auth.uid()::text = (storage.foldername(name))[1]
  );

-- Storage policies for provider-certificates (private bucket)
create policy "Authenticated users can view provider certificates"
  on storage.objects for select
  using (
    bucket_id = 'provider-certificates' 
    and auth.role() = 'authenticated'
  );

create policy "Authenticated users can upload provider certificates"
  on storage.objects for insert
  with check (
    bucket_id = 'provider-certificates' 
    and auth.role() = 'authenticated'
  );

create policy "Users can update their own provider certificates"
  on storage.objects for update
  using (
    bucket_id = 'provider-certificates' 
    and auth.uid()::text = (storage.foldername(name))[1]
  );
```

### Step 3: Verify Migration Success
After running the migration, you should see:
- ✅ "Success. No rows returned"
- ✅ No error messages

### Step 4: Test Provider Registration
1. Go to http://192.168.0.106:5173/provider-onboarding
2. Fill out the registration form completely
3. Registration should now succeed and save to Supabase

## What Changed
The code now has **fallback logic** that will work even without the migration, BUT with limited functionality:
- ❌ No first/last name split (only full_name)
- ❌ No date of birth
- ❌ No profile photos or certificates
- ❌ No availability slots
- ❌ No GPS coordinates

**For full functionality, you MUST apply the migration.**

## Verification Commands
After applying the migration, verify in SQL Editor:

```sql
-- Check users table columns
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'users' 
AND column_name IN ('first_name', 'last_name', 'dob');

-- Check service_providers table columns
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'service_providers' 
AND column_name IN ('availability', 'profile_photo_url', 'certificate_url', 'latitude', 'longitude');

-- Check storage buckets
SELECT id, name, public FROM storage.buckets;
```

## Need Help?
If the migration fails, check:
1. Do you have owner/admin access to the Supabase project?
2. Are there any existing policies conflicting with the new ones?
3. Run the verification commands above to see what succeeded/failed
