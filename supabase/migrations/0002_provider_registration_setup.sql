-- ============================================================
-- Sahaay — STEP 11: Real Service Provider Registration Setup
-- Run this in the Supabase SQL editor:
-- https://supabase.com/dashboard/project/fzefnqmpmzcdmkmjkagw/sql
-- ============================================================

-- 1. Ensure required extensions exist
create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

-- 2. Add missing columns on service_providers table
alter table public.service_providers
  add column if not exists availability jsonb default '[]'::jsonb,
  add column if not exists profile_photo_url text;

-- 3. Add missing INSERT policy on users table
drop policy if exists "users insert own" on public.users;
create policy "users insert own"
  on public.users
  for insert
  with check (auth.uid() = id);

-- 4. Enable RLS and add policies on provider_skills
alter table public.provider_skills enable row level security;

drop policy if exists "provider_skills are readable" on public.provider_skills;
create policy "provider_skills are readable"
  on public.provider_skills
  for select
  using (true);

drop policy if exists "providers insert own skills" on public.provider_skills;
create policy "providers insert own skills"
  on public.provider_skills
  for insert
  with check (
    exists (
      select 1 from public.service_providers p
      where p.id = provider_id and p.user_id = auth.uid()
    )
  );

drop policy if exists "providers delete own skills" on public.provider_skills;
create policy "providers delete own skills"
  on public.provider_skills
  for delete
  using (
    exists (
      select 1 from public.service_providers p
      where p.id = provider_id and p.user_id = auth.uid()
    )
  );

-- 5. Seed standard skills for the 7 core service categories
-- Electrician (service_id = 1)
insert into public.skills (name, service_id) values
  ('Electrical Wiring & Conduit', 1),
  ('Switch & Socket Replacement', 1),
  ('Ceiling & Exhaust Fan Repair', 1),
  ('MCB & Fuse Box Repair', 1),
  ('Inverter & Battery Setup', 1),
  ('Appliance & Lighting Installation', 1)
on conflict (service_id, name) do nothing;

-- Plumber (service_id = 2)
insert into public.skills (name, service_id) values
  ('Pipe Leakage & Burst Repair', 2),
  ('Tap & Mixer Installation', 2),
  ('Bathroom Sanitary Fittings', 2),
  ('Drain Cleaning & Unblocking', 2),
  ('Water Tank & Motor Setup', 2),
  ('Geyser & Water Heater Fitting', 2)
on conflict (service_id, name) do nothing;

-- Carpenter (service_id = 3)
insert into public.skills (name, service_id) values
  ('Furniture Assembly & Repair', 3),
  ('Door & Window Repair', 3),
  ('Custom Cabinets & Shelving', 3),
  ('Lock & Handle Replacement', 3),
  ('Wood Polishing & Varnish', 3),
  ('Bed & Table Custom Work', 3)
on conflict (service_id, name) do nothing;

-- Painter (service_id = 4)
insert into public.skills (name, service_id) values
  ('Interior Wall Painting', 4),
  ('Exterior House Painting', 4),
  ('Waterproofing & Seepage Treatment', 4),
  ('Putty & Primer Work', 4),
  ('Texture & Stencil Design', 4),
  ('Wood & Metal Polish', 4)
on conflict (service_id, name) do nothing;

-- Cleaner (service_id = 5)
insert into public.skills (name, service_id) values
  ('Full Home Deep Cleaning', 5),
  ('Kitchen & Chimney Degreasing', 5),
  ('Bathroom Scrubbing & Sanitisation', 5),
  ('Sofa & Carpet Shampooing', 5),
  ('Floor Scrubbing & Polishing', 5),
  ('Balcony & Window Cleaning', 5)
on conflict (service_id, name) do nothing;

-- Driver (service_id = 6)
insert into public.skills (name, service_id) values
  ('Daily Commute Driving', 6),
  ('Outstation & Highway Trips', 6),
  ('Automatic & Luxury Cars', 6),
  ('Manual Transmission Driving', 6),
  ('Night Driving & Emergency', 6),
  ('Commercial & Heavy Vehicles', 6)
on conflict (service_id, name) do nothing;

-- Technician (service_id = 7)
insert into public.skills (name, service_id) values
  ('AC Servicing & Gas Refill', 7),
  ('Refrigerator & Freezer Repair', 7),
  ('Washing Machine Repair', 7),
  ('Microwave & Oven Repair', 7),
  ('RO & Water Purifier Service', 7),
  ('Geyser & TV Installation', 7)
on conflict (service_id, name) do nothing;

-- 6. Atomic provider registration function (bypasses RLS via security definer)
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
  p_skill_ids      integer[] default '{}'::integer[]
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_row    public.users%rowtype;
  v_provider_row public.service_providers%rowtype;
  v_skill_id    integer;
begin
  -- 1. Upsert users table
  insert into public.users (id, email, full_name, phone, city, state, role)
    values (p_user_id, p_email, p_full_name, p_phone, p_city, p_state, 'provider')
    on conflict (id) do update
      set full_name = excluded.full_name,
          phone     = coalesce(excluded.phone, public.users.phone),
          city      = coalesce(excluded.city, public.users.city),
          state     = coalesce(excluded.state, public.users.state),
          role      = 'provider',
          updated_at = now()
    returning * into v_user_row;

  -- 2. Upsert service_providers table
  insert into public.service_providers
    (user_id, service_id, bio, years_experience, service_radius_km, availability, verification_status, is_available)
  values
    (p_user_id, p_service_id, p_bio, p_years_exp, p_radius_km, p_availability, 'pending', true)
    on conflict (user_id) do update
      set service_id        = excluded.service_id,
          bio               = excluded.bio,
          years_experience  = excluded.years_experience,
          service_radius_km = excluded.service_radius_km,
          availability      = excluded.availability,
          updated_at        = now()
    returning * into v_provider_row;

  -- 3. Link skills if provided
  if array_length(p_skill_ids, 1) > 0 then
    -- Remove old skills for clean update
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
