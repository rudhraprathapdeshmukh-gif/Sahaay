-- ============================================================
-- Sahaay — Migration 0011: Reviews & Rating Synchronization
-- Run this in the Supabase SQL editor:
-- https://supabase.com/dashboard/project/fzefnqmpmzcdmkmjkagw/sql
-- ============================================================

-- 1. Create reviews table
create table if not exists public.reviews (
  id           uuid primary key default gen_random_uuid(),
  booking_id   uuid not null unique references public.bookings(id) on delete cascade,
  customer_id  uuid not null references public.users(id) on delete cascade,
  provider_id  uuid not null references public.service_providers(id) on delete cascade,
  rating       int not null check (rating >= 1 and rating <= 5),
  comment      text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- Indexes
create index if not exists idx_reviews_provider on public.reviews(provider_id);
create index if not exists idx_reviews_customer on public.reviews(customer_id);
create index if not exists idx_reviews_booking on public.reviews(booking_id);

-- Enable RLS
alter table public.reviews enable row level security;

-- RLS policies for reviews:
-- Public can read all reviews
drop policy if exists "Public read reviews" on public.reviews;
create policy "Public read reviews"
  on public.reviews for select
  using (true);

-- Customers can insert a review for their completed booking
drop policy if exists "Customers insert review" on public.reviews;
create policy "Customers insert review"
  on public.reviews for insert
  with check (
    auth.uid() = customer_id
    and exists (
      select 1 from public.bookings b
      where b.id = booking_id
        and b.customer_id = auth.uid()
        and b.status = 'completed'
    )
  );

-- RLS policy for RLS on bookings table (ensure customers and providers can manage their bookings)
alter table public.bookings enable row level security;

drop policy if exists "Public read bookings for participants" on public.bookings;
create policy "Public read bookings for participants"
  on public.bookings for select
  using (
    auth.uid() = customer_id
    or auth.uid() in (select user_id from public.service_providers where id = provider_id)
    or exists (select 1 from public.users where id = auth.uid() and role = 'admin')
  );

drop policy if exists "Customers create bookings" on public.bookings;
create policy "Customers create bookings"
  on public.bookings for insert
  with check (auth.uid() = customer_id);

drop policy if exists "Participants update bookings" on public.bookings;
create policy "Participants update bookings"
  on public.bookings for update
  using (
    auth.uid() = customer_id
    or auth.uid() in (select user_id from public.service_providers where id = provider_id)
    or exists (select 1 from public.users where id = auth.uid() and role = 'admin')
  );

drop policy if exists "Participants delete bookings" on public.bookings;
create policy "Participants delete bookings"
  on public.bookings for delete
  using (
    auth.uid() = customer_id
    or auth.uid() in (select user_id from public.service_providers where id = provider_id)
    or exists (select 1 from public.users where id = auth.uid() and role = 'admin')
  );

-- 2. Trigger function to update provider rating and jobs_completed count
create or replace function public.sync_provider_rating_on_review()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_avg_rating numeric(3,2);
  v_completed_count int;
begin
  -- Compute total completed jobs and average rating from reviews table
  select coalesce(round(avg(rating)::numeric, 1), 0.0)
    into v_avg_rating
    from public.reviews
   where provider_id = coalesce(new.provider_id, old.provider_id);

  -- Update service_providers table
  update public.service_providers
     set rating = v_avg_rating,
         jobs_completed = (
           select count(*)
             from public.bookings
            where provider_id = coalesce(new.provider_id, old.provider_id)
              and status = 'completed'
         ),
         updated_at = now()
   where id = coalesce(new.provider_id, old.provider_id);

  return new;
end;
$$;

-- Drop trigger if exists
drop trigger if exists trg_sync_provider_rating on public.reviews;

-- Create trigger on INSERT, UPDATE, DELETE of reviews
create trigger trg_sync_provider_rating
  after insert or update or delete on public.reviews
  for each row
  execute function public.sync_provider_rating_on_review();

-- Also update provider jobs_completed count when booking status changes to 'completed'
create or replace function public.sync_provider_jobs_completed_on_booking()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status = 'completed' and (old.status is null or old.status != 'completed') then
    update public.service_providers
       set jobs_completed = (
             select count(*)
               from public.bookings
              where provider_id = new.provider_id
                and status = 'completed'
           ),
           updated_at = now()
     where id = new.provider_id;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_sync_provider_jobs_completed on public.bookings;
create trigger trg_sync_provider_jobs_completed
  after update on public.bookings
  for each row
  execute function public.sync_provider_jobs_completed_on_booking();

-- Grants
grant all on public.reviews to authenticated, anon;
grant all on public.bookings to authenticated, anon;
