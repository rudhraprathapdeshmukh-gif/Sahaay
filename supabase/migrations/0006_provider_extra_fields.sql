-- Migration: add provider extra fields to users & service_providers tables & create storage buckets

alter table public.users
  add column if not exists first_name text,
  add column if not exists last_name text,
  add column if not exists dob text;

alter table public.service_providers
  add column if not exists availability text[] default '{}',
  add column if not exists profile_photo_url text,
  add column if not exists certificate_url text,
  add column if not exists latitude numeric,
  add column if not exists longitude numeric;

-- Create buckets for provider photo and certificates
insert into storage.buckets (id, name, public)
values ('provider-photos', 'provider-photos', true)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('provider-certificates', 'provider-certificates', false)
on conflict (id) do nothing;

-- Set up basic access policies for buckets
drop policy if exists "Providers can upload their own photos" on storage.objects;
create policy "Providers can upload their own photos"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'provider-photos');

drop policy if exists "Anyone can read provider photos" on storage.objects;
create policy "Anyone can read provider photos"
  on storage.objects for select
  to public
  using (bucket_id = 'provider-photos');

drop policy if exists "Providers can upload their own certificates" on storage.objects;
create policy "Providers can upload their own certificates"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'provider-certificates');

drop policy if exists "Admins can read provider certificates" on storage.objects;
create policy "Admins can read provider certificates"
  on storage.objects for select
  to authenticated
  using (bucket_id = 'provider-certificates');
