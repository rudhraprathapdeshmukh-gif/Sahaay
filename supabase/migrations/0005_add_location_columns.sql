-- ============================================================
-- Sahaay — STEP 14: Location Services Database Schema
-- Add latitude/longitude columns to support geolocation
-- Run this in the Supabase SQL editor:
-- https://supabase.com/dashboard/project/fzefnqmpmzcdmkmjkagw/sql
-- ============================================================

-- 1. Add location columns to users table
alter table public.users
  add column if not exists latitude decimal(10, 8),
  add column if not exists longitude decimal(11, 8);

-- Create index for fast geographic queries on users
create index if not exists idx_users_location on public.users(latitude, longitude);

-- 2. Add location columns to service_providers table
alter table public.service_providers
  add column if not exists latitude decimal(10, 8),
  add column if not exists longitude decimal(11, 8);

-- Create index for fast geographic queries on providers
create index if not exists idx_providers_location on public.service_providers(latitude, longitude);

-- 3. Update register_provider function to accept location
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
  p_availability   jsonb default '[]'::jsonb,
  p_skill_ids      integer[] default '{}'::integer[],
  p_latitude       decimal(10, 8) default null,
  p_longitude      decimal(11, 8) default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_row       public.users%rowtype;
  v_provider_row   public.service_providers%rowtype;
  v_skill_id       integer;
begin
  -- 1. Upsert users table with location
  insert into public.users (id, email, full_name, phone, city, state, role, latitude, longitude)
    values (p_user_id, p_email, p_full_name, p_phone, p_city, p_state, 'provider', p_latitude, p_longitude)
    on conflict (id) do update
      set full_name    = excluded.full_name,
          phone        = coalesce(excluded.phone, public.users.phone),
          city         = coalesce(excluded.city, public.users.city),
          state        = coalesce(excluded.state, public.users.state),
          role         = 'provider',
          latitude     = coalesce(excluded.latitude, public.users.latitude),
          longitude    = coalesce(excluded.longitude, public.users.longitude),
          updated_at   = now()
    returning * into v_user_row;

  -- 2. Upsert service_providers table with location
  insert into public.service_providers
    (user_id, service_id, bio, years_experience, service_radius_km, availability, verification_status, is_available, latitude, longitude)
    values
    (p_user_id, p_service_id, p_bio, p_years_exp, p_radius_km, p_availability, 'pending', true, p_latitude, p_longitude)
    on conflict (user_id) do update
      set service_id        = excluded.service_id,
          bio               = excluded.bio,
          years_experience  = excluded.years_experience,
          service_radius_km = excluded.service_radius_km,
          availability      = excluded.availability,
          latitude          = coalesce(excluded.latitude, public.service_providers.latitude),
          longitude         = coalesce(excluded.longitude, public.service_providers.longitude),
          updated_at        = now()
    returning * into v_provider_row;

  -- 3. Link skills if provided
  if array_length(p_skill_ids, 1) > 0 then
    delete from public.provider_skills where provider_id = v_provider_row.id;
    foreach v_skill_id in array p_skill_ids loop
      insert into public.provider_skills (provider_id, skill_id)
        values (v_provider_row.id, v_skill_id)
        on conflict do nothing;
    end loop;
  end if;

  return jsonb_build_object(
    'user', to_jsonb(v_user_row),
    'provider', to_jsonb(v_provider_row)
  );
end;
$$;

-- 4. Add RLS policies for location data
-- Allow read access to location data for searching
create policy "users location readable" on public.users
  for select
  using (true);

create policy "users location updatable" on public.users
  for update
  using (auth.uid() = id);

create policy "providers location readable" on public.service_providers
  for select
  using (true);

create policy "providers location updatable" on public.service_providers
  for update
  using (auth.uid() = user_id);

-- 5. Create a helper function to find providers within a radius (PostGIS alternative)
-- This function returns providers within a given distance using Haversine formula
create or replace function public.find_providers_nearby(
  p_latitude       decimal(10, 8),
  p_longitude      decimal(11, 8),
  p_radius_km      integer,
  p_service_id     integer default null,
  p_limit          integer default 50
)
returns table (
  id                uuid,
  user_id           uuid,
  full_name         text,
  city              text,
  state             text,
  service_name      text,
  bio               text,
  years_experience  text,
  rating            numeric(2,1),
  jobs_completed    int,
  distance_km       numeric(10,2),
  latitude          decimal(10,8),
  longitude         decimal(11,8)
)
language plpgsql
set search_path = public
as $$
begin
  return query
  select
    sp.id,
    sp.user_id,
    u.full_name,
    u.city,
    u.state,
    s.name as service_name,
    sp.bio,
    sp.years_experience,
    sp.rating,
    sp.jobs_completed,
    (
      6371 * acos(
        cos(radians(p_latitude)) *
        cos(radians(coalesce(sp.latitude, u.latitude))) *
        cos(radians(coalesce(sp.longitude, u.longitude)) - radians(p_longitude)) +
        sin(radians(p_latitude)) * sin(radians(coalesce(sp.latitude, u.latitude)))
      )
    )::numeric(10,2) as distance_km,
    coalesce(sp.latitude, u.latitude) as latitude,
    coalesce(sp.longitude, u.longitude) as longitude
  from public.service_providers sp
  join public.users u on u.id = sp.user_id
  left join public.services s on s.id = sp.service_id
  where sp.is_available = true
    and sp.verification_status = 'verified'
    and (
      -- Has location data
      (sp.latitude is not null and sp.longitude is not null) or
      (u.latitude is not null and u.longitude is not null)
    )
    and (p_service_id is null or sp.service_id = p_service_id)
    and (
      6371 * acos(
        cos(radians(p_latitude)) *
        cos(radians(coalesce(sp.latitude, u.latitude))) *
        cos(radians(coalesce(sp.longitude, u.longitude)) - radians(p_longitude)) +
        sin(radians(p_latitude)) * sin(radians(coalesce(sp.latitude, u.latitude)))
      )
    ) <= p_radius_km
  order by distance_km asc
  limit p_limit;
end;
$$;

-- 6. Create a function to update user location
create or replace function public.update_user_location(
  p_user_id     uuid,
  p_latitude    decimal(10, 8),
  p_longitude   decimal(11, 8)
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.users
  set latitude = p_latitude,
      longitude = p_longitude,
      updated_at = now()
  where id = p_user_id;
end;
$$;

-- 7. Create a function to update provider location
create or replace function public.update_provider_location(
  p_provider_id  uuid,
  p_latitude     decimal(10, 8),
  p_longitude    decimal(11, 8)
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.service_providers
  set latitude = p_latitude,
      longitude = p_longitude,
      updated_at = now()
  where id = p_provider_id;
end;
$$;

-- ============================================================
-- Migration complete. Next steps:
-- 1. Run this script in Supabase SQL editor
-- 2. Existing data will have NULL for lat/lng
-- 3. New registrations will capture location automatically
-- 4. Customer search will now work with real location data
-- ============================================================