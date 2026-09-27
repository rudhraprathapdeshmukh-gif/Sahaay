-- ============================================================
-- Sahaay — Migration 0010: Admin Verification — Full Details + Immutable Decisions
-- Run this in the Supabase SQL editor:
-- https://supabase.com/dashboard/project/fzefnqmpmzcdmkmjkagw/sql
--
-- What this does:
--  1. Replaces get_admin_provider_applications() so it returns the
--     provider's submitted SKILLS (aggregated) along with every other
--     field, so the Admin queue can show all submitted details.
--  2. Adds admin_finalize_provider_status() which makes the Approve /
--     Reject decision PERMANENT and irreversible:
--       * pending/unverified -> verified  (one-way)
--       * pending/unverified -> rejected  (one-way)
--       * Once verified, it can NEVER be changed to rejected (and vice-versa)
--     The final decision is persisted securely in Supabase.
-- ============================================================

-- ------------------------------------------------------------------
-- 1. Rebuild get_admin_provider_applications to include skills + renamed applied_at
-- ------------------------------------------------------------------
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
    coalesce(u.full_name, 'Provider') as full_name,
    coalesce(u.email, '') as email,
    u.phone,
    u.city,
    u.state,
    u.avatar_url,
    coalesce(sp.latitude, u.latitude) as latitude,
    coalesce(sp.longitude, u.longitude) as longitude,
    coalesce(
      (
        select coalesce(jsonb_agg(jsonb_build_object('id', sk.id, 'name', sk.name) order by sk.name), '[]'::jsonb)
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

-- ------------------------------------------------------------------
-- 2. Immutable final-decision RPC
--    Only allows:  (pending | unverified) -> (verified | rejected)
--    Throws if a decision is attempted on an already-decided provider.
-- ------------------------------------------------------------------
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
  v_current text;
  v_provider public.service_providers%rowtype;
begin
  -- Validate requested status
  if p_status not in ('verified', 'rejected') then
    raise exception 'Invalid status "%". Only verified or rejected are allowed.', p_status;
  end if;

  -- Lock the current status
  select verification_status
    into v_current
    from public.service_providers
   where id = p_provider_id
     for update;

  if not found then
    raise exception 'Provider application not found with ID %', p_provider_id;
  end if;

  -- A decision has already been made -> the decision is PERMANENT.
  if v_current in ('verified', 'rejected') then
    raise exception 'This provider has already been % and the decision is final. It cannot be changed.', v_current;
  end if;

  -- First (and only) decision.
  update public.service_providers
     set verification_status = p_status,
         updated_at = now()
   where id = p_provider_id
   returning * into v_provider;

  return to_jsonb(v_provider);
end;
$$;

-- Keep the older update function working as a compatibility alias,
-- but route it through the immutable logic as well.
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

-- Grant execution to authenticated users (and anon for safety)
grant execute on function public.get_admin_provider_applications() to authenticated, anon;
grant execute on function public.admin_finalize_provider_status(uuid, text) to authenticated, anon;
grant execute on function public.admin_update_provider_status(uuid, text) to authenticated, anon;
