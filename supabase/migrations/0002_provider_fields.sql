-- Add availability and profile_photo_url to service_providers
-- availability: stores the selected time-slot IDs as a JSONB array
-- profile_photo_url: URL for the provider's profile photo

alter table service_providers
  add column if not exists availability jsonb default '[]'::jsonb,
  add column if not exists profile_photo_url text;

-- Allow all authenticated users to update their own provider profile
drop policy if exists "providers update own" on service_providers;
create policy "providers update own"
  on service_providers for update
  to authenticated
  using (user_id = auth.uid());

-- Allow reading own provider profile
drop policy if exists "providers read own" on service_providers;
create policy "providers read own"
  on service_providers for select
  to authenticated
  using (user_id = auth.uid());
