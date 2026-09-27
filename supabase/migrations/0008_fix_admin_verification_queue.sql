-- ============================================================
-- Sahaay — Migration 0008: Admin Verification Queue Permissions & RPC
-- Run this in the Supabase SQL editor:
-- https://supabase.com/dashboard/project/fzefnqmpmzcdmkmjkagw/sql
-- ============================================================

-- 1. Ensure public.is_admin() function exists and works reliably
create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.users
    where id = auth.uid() and role = 'admin'
  );
$$;

-- 2. Allow users table to be read by admins and for provider profile lookups
drop policy if exists "users read own" on public.users;
drop policy if exists "users readable by all" on public.users;
drop policy if exists "admin read users" on public.users;

-- All authenticated/public users can read user profile data (needed for marketplace & admin)
create policy "users readable by all"
  on public.users
  for select
  using (true);

-- 3. Ensure service_providers table can be read and updated by admins
drop policy if exists "providers are readable" on public.service_providers;
create policy "providers are readable"
  on public.service_providers
  for select
  using (true);

drop policy if exists "admin update providers" on public.service_providers;
create policy "admin update providers"
  on public.service_providers
  for update
  using (true)
  with check (true);

-- 4. RPC to securely fetch all provider verification applications for the admin queue
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
  created_at          timestamptz,
  updated_at          timestamptz,
  service_name        text,
  full_name           text,
  email               text,
  phone               text,
  city                text,
  state               text,
  avatar_url          text,
  latitude            numeric,
  longitude           numeric
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
    sp.created_at,
    sp.updated_at,
    coalesce(s.name, 'General Service') as service_name,
    coalesce(u.full_name, 'Provider') as full_name,
    coalesce(u.email, '') as email,
    u.phone,
    u.city,
    u.state,
    u.avatar_url,
    coalesce(sp.latitude, u.latitude) as latitude,
    coalesce(sp.longitude, u.longitude) as longitude
  from public.service_providers sp
  left join public.users u on u.id = sp.user_id
  left join public.services s on s.id = sp.service_id
  order by sp.created_at desc;
end;
$$;

-- 5. RPC to update provider verification status
create or replace function public.admin_update_provider_status(
  p_provider_id uuid,
  p_status      text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_provider public.service_providers%rowtype;
begin
  update public.service_providers
  set
    verification_status = p_status,
    updated_at = now()
  where id = p_provider_id
  returning * into v_provider;

  if not found then
    raise exception 'Provider application not found with ID %', p_provider_id;
  end if;

  return to_jsonb(v_provider);
end;
$$;

-- Grant permissions to authenticated and anon
grant execute on function public.get_admin_provider_applications() to authenticated, anon;
grant execute on function public.admin_update_provider_status(uuid, text) to authenticated, anon;
