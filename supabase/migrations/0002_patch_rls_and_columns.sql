-- ============================================================
-- Sahaay — PATCH: add missing INSERT policy for users table
-- and add availability / profile_photo_url columns.
--
-- Run this in the Supabase SQL editor:
-- https://supabase.com/dashboard/project/fzefnqmpmzcdmkmjkagw/sql
-- ============================================================

-- 1. Add the INSERT policy that was missing from the initial schema
create policy "users insert own"
  on public.users
  for insert
  with check (auth.uid() = id);

-- 2. Add availability (JSONB) and profile_photo_url to service_providers
alter table public.service_providers
  add column if not exists availability jsonb default '[]'::jsonb,
  add column if not exists profile_photo_url text;

-- 3. Atomic provider registration function (security definer = bypasses RLS,
--    avoids 401 timing issues after auth.signUp completes)
create or replace function public.register_provider(
  p_user_id        uuid,
  p_email          text,
  p_full_name      text,
  p_phone          text,
  p_city           text,
  p_state          text,
  p_service_id     integer,
  p_bio            text,
  p_years_exp      text,
  p_radius_km      integer,
  p_availability   jsonb default '[]'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_row    public.users%rowtype;
  v_provider_row public.service_providers%rowtype;
begin
  insert into public.users (id, email, full_name, phone, city, state, role)
    values (p_user_id, p_email, p_full_name, p_phone, p_city, p_state, 'provider')
    on conflict (id) do update
      set full_name = excluded.full_name,
          phone     = excluded.phone,
          city      = excluded.city,
          state     = excluded.state,
          role      = excluded.role
    returning * into v_user_row;

  insert into public.service_providers
    (user_id, service_id, bio, years_experience, service_radius_km, availability, verification_status, is_available)
  values
    (p_user_id, p_service_id, p_bio, p_years_exp, p_radius_km, p_availability, 'pending', true)
    on conflict (user_id) do update
      set service_id         = excluded.service_id,
          bio                = excluded.bio,
          years_experience   = excluded.years_experience,
          service_radius_km  = excluded.service_radius_km,
          availability       = excluded.availability
    returning * into v_provider_row;

  return jsonb_build_object('user', to_jsonb(v_user_row), 'provider', to_jsonb(v_provider_row));
end;
$$;

-- 4. Allow authenticated users to select services (already done but redundant)
drop policy if exists "services are readable" on public.services;
create policy "services are readable" on public.services for select using (true);
