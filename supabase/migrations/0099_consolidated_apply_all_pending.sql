-- ============================================================
-- CONSOLIDATED MIGRATION SCRIPT — Run this ONCE in Supabase SQL Editor
-- Project: fzefnqmpmzcdmkmjkagw
-- URL: https://supabase.com/dashboard/project/fzefnqmpmzcdmkmjkagw/sql
-- ============================================================
-- This script is fully idempotent (safe to re-run).
-- It applies everything from migrations 0005 and 0010 that may
-- not have been applied yet.
-- ============================================================

-- ============================================================
-- STEP 1: Add latitude/longitude to the users table (migration 0005)
-- ============================================================
-- If these columns already exist, IF NOT EXISTS skips them.

alter table public.users
  add column if not exists latitude  decimal(10, 8),
  add column if not exists longitude decimal(11, 8);

create index if not exists idx_users_location
  on public.users(latitude, longitude);

-- ============================================================
-- STEP 2: Ensure service_providers has latitude/longitude (migration 0006)
-- ============================================================
-- Columns were added by 0006; this is a safety net if 0006 was skipped.

alter table public.service_providers
  add column if not exists latitude  decimal(10, 8),
  add column if not exists longitude decimal(11, 8);

create index if not exists idx_providers_location
  on public.service_providers(latitude, longitude);

-- Ensure availability column exists as jsonb
alter table public.service_providers
  add column if not exists availability jsonb default '[]'::jsonb;

-- Ensure profile_photo_url and certificate_url exist
alter table public.service_providers
  add column if not exists profile_photo_url text,
  add column if not exists certificate_url   text;

-- ============================================================
-- STEP 3: RLS policies for location data (migration 0005)
-- ============================================================

-- Users: anyone can read (needed for customer-provider discovery)
drop policy if exists "users location readable" on public.users;
create policy "users location readable"
  on public.users for select using (true);

-- Users: only the owner can update their own location
drop policy if exists "users location updatable" on public.users;
create policy "users location updatable"
  on public.users for update using (auth.uid() = id);

-- Providers: anyone can read
drop policy if exists "providers location readable" on public.service_providers;
create policy "providers location readable"
  on public.service_providers for select using (true);

-- Providers: only the provider can update their own row
drop policy if exists "providers location updatable" on public.service_providers;
create policy "providers location updatable"
  on public.service_providers for update using (auth.uid() = user_id);

-- ============================================================
-- STEP 4: register_provider function with location support
-- ============================================================

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
  p_longitude      decimal(11, 8) default null,
  p_certificate_url text       default null
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
  insert into public.users (id, email, full_name, phone, city, state, role, latitude, longitude)
    values (p_user_id, p_email, p_full_name, p_phone, p_city, p_state, 'provider', p_latitude, p_longitude)
    on conflict (id) do update
      set full_name  = excluded.full_name,
          phone      = coalesce(excluded.phone, public.users.phone),
          city       = coalesce(excluded.city, public.users.city),
          state      = coalesce(excluded.state, public.users.state),
          role       = 'provider',
          latitude   = coalesce(excluded.latitude, public.users.latitude),
          longitude  = coalesce(excluded.longitude, public.users.longitude),
          updated_at = now()
    returning * into v_user_row;

  insert into public.service_providers
    (user_id, service_id, bio, years_experience, service_radius_km, availability, verification_status, is_available, latitude, longitude, certificate_url)
    values
    (p_user_id, p_service_id, p_bio, p_years_exp, p_radius_km, p_availability, 'pending', true, p_latitude, p_longitude, p_certificate_url)
    on conflict (user_id) do update
      set service_id        = excluded.service_id,
          bio               = excluded.bio,
          years_experience  = excluded.years_experience,
          service_radius_km = excluded.service_radius_km,
          availability      = excluded.availability,
          latitude          = coalesce(excluded.latitude, public.service_providers.latitude),
          longitude         = coalesce(excluded.longitude, public.service_providers.longitude),
          certificate_url   = coalesce(excluded.certificate_url, public.service_providers.certificate_url),
          updated_at        = now()
    returning * into v_provider_row;

  if array_length(p_skill_ids, 1) > 0 then
    delete from public.provider_skills where provider_id = v_provider_row.id;
    foreach v_skill_id in array p_skill_ids loop
      insert into public.provider_skills (provider_id, skill_id)
        values (v_provider_row.id, v_skill_id)
        on conflict do nothing;
    end loop;
  end if;

  return jsonb_build_object(
    'user',     to_jsonb(v_user_row),
    'provider', to_jsonb(v_provider_row)
  );
end;
$$;

-- ============================================================
-- STEP 5: Helper functions for location updates
-- ============================================================

create or replace function public.update_user_location(
  p_user_id   uuid,
  p_latitude  decimal(10, 8),
  p_longitude decimal(11, 8)
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.users
  set latitude  = p_latitude,
      longitude = p_longitude,
      updated_at = now()
  where id = p_user_id;
end;
$$;

create or replace function public.update_provider_location(
  p_provider_id uuid,
  p_latitude    decimal(10, 8),
  p_longitude   decimal(11, 8)
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.service_providers
  set latitude  = p_latitude,
      longitude = p_longitude,
      updated_at = now()
  where id = p_provider_id;
end;
$$;

-- ============================================================
-- STEP 6: find_providers_nearby RPC (migration 0005)
-- ============================================================

create or replace function public.find_providers_nearby(
  p_latitude   decimal(10, 8),
  p_longitude  decimal(11, 8),
  p_radius_km  integer,
  p_service_id integer default null,
  p_limit      integer default 50
)
returns table (
  id               uuid,
  user_id          uuid,
  full_name        text,
  city             text,
  state            text,
  service_name     text,
  bio              text,
  years_experience text,
  rating           numeric(2,1),
  jobs_completed   int,
  distance_km      numeric(10,2),
  latitude         decimal(10,8),
  longitude        decimal(11,8)
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
    coalesce(sp.latitude,  u.latitude)  as latitude,
    coalesce(sp.longitude, u.longitude) as longitude
  from public.service_providers sp
  join public.users u on u.id = sp.user_id
  left join public.services s on s.id = sp.service_id
  where sp.is_available = true
    and sp.verification_status = 'verified'
    and (
      (sp.latitude is not null and sp.longitude is not null)
      or
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

-- ============================================================
-- STEP 7: get_admin_provider_applications RPC (migration 0010)
-- Returns full details + skills for admin verification queue.
-- ============================================================

create or replace function public.get_admin_provider_applications()
returns table (
  id                  uuid,
  user_id             uuid,
  service_id          int,
  bio                 text,
  years_experience    text,
  verification_status text,
  profile_photo_url   text,
  certificate_url     text,
  service_radius_km   int,
  availability        jsonb,
  applied_at          timestamptz,
  updated_at          timestamptz,
  service_name        text,
  full_name           text,
  email               text,
  phone               text,
  city                text,
  state               text,
  avatar_url          text,
  latitude            numeric,
  longitude           numeric,
  skills              jsonb
)
language plpgsql
security definer
set search_path = public
as $$
begin
  return query
  select
    sp.id,
    sp.user_id,
    sp.service_id,
    sp.bio,
    sp.years_experience,
    sp.verification_status,
    sp.profile_photo_url,
    sp.certificate_url,
    sp.service_radius_km,
    coalesce(to_jsonb(sp.availability), '[]'::jsonb) as availability,
    sp.created_at as applied_at,
    sp.updated_at,
    coalesce(s.name, 'General Service') as service_name,
    coalesce(u.full_name, 'Provider')   as full_name,
    coalesce(u.email, '')                as email,
    u.phone,
    u.city,
    u.state,
    u.avatar_url,
    coalesce(sp.latitude,  u.latitude)  as latitude,
    coalesce(sp.longitude, u.longitude) as longitude,
    coalesce(
      (
        select coalesce(
          jsonb_agg(jsonb_build_object('id', sk.id, 'name', sk.name) order by sk.name),
          '[]'::jsonb
        )
        from public.provider_skills ps
        join public.skills sk on sk.id = ps.skill_id
        where ps.provider_id = sp.id
      ),
      '[]'::jsonb
    ) as skills
  from public.service_providers sp
  left join public.users u on u.id = sp.user_id
  left join public.services s on s.id = sp.service_id
  order by sp.created_at desc;
end;
$$;

-- ============================================================
-- STEP 8: Immutable admin finalize decision RPC (migration 0010)
-- ============================================================

create or replace function public.admin_finalize_provider_status(
  p_provider_id uuid,
  p_status      text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_current  text;
  v_provider public.service_providers%rowtype;
begin
  if p_status not in ('verified', 'rejected') then
    raise exception 'Invalid status "%. Only verified or rejected are allowed.', p_status;
  end if;

  select verification_status
    into v_current
    from public.service_providers
   where id = p_provider_id
     for update;

  if not found then
    raise exception 'Provider application not found with ID %', p_provider_id;
  end if;

  if v_current in ('verified', 'rejected') then
    raise exception 'This provider has already been % and the decision is final. It cannot be changed.', v_current;
  end if;

  update public.service_providers
     set verification_status = p_status,
         updated_at = now()
   where id = p_provider_id
   returning * into v_provider;

  return to_jsonb(v_provider);
end;
$$;

-- Compatibility alias
create or replace function public.admin_update_provider_status(
  p_provider_id uuid,
  p_status      text
)
returns jsonb
language sql
security definer
set search_path = public
as $$
  select public.admin_finalize_provider_status(p_provider_id, p_status);
$$;

-- ============================================================
-- STEP 9: Grants
-- ============================================================

grant execute on function public.get_admin_provider_applications()           to authenticated, anon;
grant execute on function public.admin_finalize_provider_status(uuid, text)  to authenticated, anon;
grant execute on function public.admin_update_provider_status(uuid, text)    to authenticated, anon;
grant execute on function public.find_providers_nearby(decimal, decimal, integer, integer, integer) to authenticated, anon;
grant execute on function public.update_user_location(uuid, decimal, decimal)       to authenticated;
grant execute on function public.update_provider_location(uuid, decimal, decimal)   to authenticated;

-- ============================================================
-- DONE — All pending migrations applied in one run.
-- ============================================================
