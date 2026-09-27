-- =============================================================
-- Sahaay — initial database schema
-- Run this in the Supabase SQL editor or via `supabase db push`
-- =============================================================

-- Enable required extensions
create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

-- ── USERS ────────────────────────────────────────────────────
-- One row per signed-in user. role determines which dashboard they see.
create table if not exists public.users (
  id           uuid primary key references auth.users(id) on delete cascade,
  email        text not null unique,
  full_name    text not null,
  phone        text,
  role         text not null default 'customer' check (role in ('customer', 'provider', 'admin')),
  avatar_url   text,
  city         text,
  state        text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index if not exists idx_users_role on public.users(role);

-- ── SERVICES ─────────────────────────────────────────────────
-- Top-level service categories shown in the marketplace.
create table if not exists public.services (
  id           serial primary key,
  name         text not null unique,
  slug         text not null unique,
  icon         text,
  description  text,
  created_at   timestamptz not null default now()
);

-- Seed the 7 core service categories
insert into public.services (name, slug, description) values
  ('Electrician', 'electrician', 'Wiring, repairs & installations'),
  ('Plumber',      'plumber',      'Pipes, leaks & bathroom fittings'),
  ('Carpenter',    'carpenter',    'Furniture repairs & custom work'),
  ('Painter',      'painter',      'Interior & exterior painting'),
  ('Cleaner',      'cleaner',      'Deep cleaning & sanitisation'),
  ('Driver',       'driver',       'Personal driver & errands'),
  ('Technician',   'technician',   'AC, fridge & appliance repair')
on conflict (name) do nothing;

-- ── SKILLS ───────────────────────────────────────────────────
-- Specific skills within a service category (e.g. "AC Repair" under "Technician").
create table if not exists public.skills (
  id           serial primary key,
  name         text not null,
  service_id   int  not null references public.services(id) on delete cascade,
  created_at   timestamptz not null default now(),
  unique (service_id, name)
);

create index if not exists idx_skills_service on public.skills(service_id);

-- ── SERVICE PROVIDERS ────────────────────────────────────────
-- Profile data that extends a user record for provider accounts.
-- One row per provider (1:1 with users where role = 'provider').
create table if not exists public.service_providers (
  id                    uuid primary key default uuid_generate_v4(),
  user_id               uuid not null unique references public.users(id) on delete cascade,
  service_id            int  not null references public.services(id),
  bio                   text,
  years_experience      text,
  service_radius_km     int  not null default 10,
  verification_status   text not null default 'pending' check (verification_status in ('unverified', 'pending', 'verified', 'rejected')),
  rating                numeric(2,1) not null default 0.0,
  jobs_completed        int  not null default 0,
  hourly_rate           numeric(10,2),
  is_available          boolean not null default true,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

create index if not exists idx_providers_user on public.service_providers(user_id);
create index if not exists idx_providers_service on public.service_providers(service_id);
create index if not exists idx_providers_verification on public.service_providers(verification_status);

-- ── PROVIDER ↔ SKILLS (many-to-many) ────────────────────────
create table if not exists public.provider_skills (
  provider_id  uuid not null references public.service_providers(id) on delete cascade,
  skill_id     int  not null references public.skills(id) on delete cascade,
  primary key (provider_id, skill_id)
);

-- ── BOOKINGS ─────────────────────────────────────────────────
-- A customer requests a service from a provider for a given time/place.
create table if not exists public.bookings (
  id              uuid primary key default uuid_generate_v4(),
  customer_id     uuid not null references public.users(id) on delete cascade,
  provider_id     uuid not null references public.service_providers(id) on delete cascade,
  service_id      int  not null references public.services(id),
  status          text not null default 'pending' check (status in ('pending', 'confirmed', 'in_progress', 'completed', 'cancelled')),
  scheduled_at    timestamptz,
  completed_at    timestamptz,
  address         text,
  notes           text,
  amount          numeric(10,2) not null default 0,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index if not exists idx_bookings_customer on public.bookings(customer_id);
create index if not exists idx_bookings_provider on public.bookings(provider_id);
create index if not exists idx_bookings_status   on public.bookings(status);

-- ── TIMESTAMP TRIGGER ───────────────────────────────────────
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_users_updated on public.users;
create trigger trg_users_updated before update on public.users
  for each row execute function public.set_updated_at();

drop trigger if exists trg_providers_updated on public.service_providers;
create trigger trg_providers_updated before update on public.service_providers
  for each row execute function public.set_updated_at();

drop trigger if exists trg_bookings_updated on public.bookings;
create trigger trg_bookings_updated before update on public.bookings
  for each row execute function public.set_updated_at();

-- ── ROW-LEVEL SECURITY ──────────────────────────────────────
alter table public.users             enable row level security;
alter table public.services          enable row level security;
alter table public.skills            enable row level security;
alter table public.service_providers enable row level security;
alter table public.provider_skills   enable row level security;
alter table public.bookings          enable row level security;

-- Services + skills are readable by everyone
create policy "services are readable" on public.services
  for select using (true);

create policy "skills are readable" on public.skills
  for select using (true);

-- Helper: security_definer function to check if current auth user is admin.
-- Bypasses RLS recursion that would occur from a plain subquery on the users table.
create or replace function public.is_admin()
returns boolean language sql security definer as $$
  select exists (
    select 1 from public.users
    where id = auth.uid() and role = 'admin'
  );
$$;

-- Users: own row or admin (via bypass function)
create policy "users read own" on public.users
  for select using (auth.uid() = id or public.is_admin());

create policy "users update own" on public.users
  for update using (auth.uid() = id);

-- Providers: public read, provider can update their own
create policy "providers are readable" on public.service_providers
  for select using (true);

create policy "providers update own" on public.service_providers
  for update using (auth.uid() = user_id);

create policy "providers insert own" on public.service_providers
  for insert with check (auth.uid() = user_id);

-- Bookings: customer and provider can read; admin can read all
create policy "bookings read own" on public.bookings
  for select using (
    auth.uid() = customer_id
    or exists (select 1 from public.service_providers p where p.id = provider_id and p.user_id = auth.uid())
    or public.is_admin()
  );

create policy "bookings create" on public.bookings
  for insert with check (auth.uid() = customer_id);

create policy "bookings update" on public.bookings
  for update using (
    auth.uid() = customer_id
    or exists (select 1 from public.service_providers p where p.id = provider_id and p.user_id = auth.uid())
  );
