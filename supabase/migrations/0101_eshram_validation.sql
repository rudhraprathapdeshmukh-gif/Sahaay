-- ============================================================
-- 0101: e-SHRAM Certificate Validation Schema
-- ============================================================

-- Table: uan_registry - stores valid UAN records
create table if not exists public.uan_registry (
  uan                text primary key check (uan ~ '^\d{12}$'),
  name               text not null,
  father_name        text,
  dob                date,
  gender             text check (gender in ('Male', 'Female', 'Other')),
  occupation         text not null,
  registered_by      uuid references public.service_providers(id) on delete set null,
  created_at         timestamptz default now(),
  updated_at         timestamptz default now()
);

create index if not exists idx_uan_registry_occupation on public.uan_registry(occupation);
create index if not exists idx_uan_registry_registered_by on public.uan_registry(registered_by);

-- Table: occupation_mappings - maps occupation text to service_id
create table if not exists public.occupation_mappings (
  id                serial primary key,
  occupation_text   text not null unique,
  service_id        int not null references public.services(id),
  created_at        timestamptz default now()
);

create index if not exists idx_occupation_mappings_service on public.occupation_mappings(service_id);

-- Seed occupation mappings
insert into public.occupation_mappings (occupation_text, service_id) values
  ('Electrician', 1),
  ('Electrical Worker', 1),
  ('Plumber', 2),
  ('Plumbing Worker', 2),
  ('Carpenter', 3),
  ('Wood Worker', 3),
  ('Painter', 4),
  ('House Painter', 4),
  ('Cleaner', 5),
  ('Cleaning Worker', 5),
  ('Driver', 6),
  ('Vehicle Driver', 6),
  ('Appliance Technician', 7),
  ('Repair Technician', 7),
  ('Care Worker', 8),
  ('Nursing Assistant', 8)
on conflict (occupation_text) do nothing;

-- Function: validate_provider_certificate - validates UAN and occupation
create or replace function public.validate_provider_certificate(
  p_uan              text,
  p_extracted_occupation text,
  p_provider_service_id int
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uan_record       public.uan_registry%rowtype;
  v_mapped_service   int;
begin
  -- 1. Check if UAN exists in registry
  select * into v_uan_record from public.uan_registry where uan = p_uan;

  if v_uan_record is null then
    return jsonb_build_object(
      'valid', false,
      'error', 'UAN not found in registry. Invalid or unregistered card.'
    );
  end if;

  -- 2. Fraud check: is this UAN already claimed by another provider?
  if v_uan_record.registered_by is not null then
    return jsonb_build_object(
      'valid', false,
      'error', 'This UAN is already in use. Cannot register with duplicate certificate.'
    );
  end if;

  -- 3. Occupation matching: map extracted text to service_id
  select service_id into v_mapped_service
    from public.occupation_mappings
   where lower(occupation_text) = lower(p_extracted_occupation)
   limit 1;

  if v_mapped_service is null then
    return jsonb_build_object(
      'valid', false,
      'error', format('Occupation "%s" not recognized. Please select a valid service category.', p_extracted_occupation)
    );
  end if;

  -- 4. Service mismatch: does mapped service match provider's selected service?
  if v_mapped_service != p_provider_service_id then
    return jsonb_build_object(
      'valid', false,
      'error', format(
        'Occupation mismatch: Your certificate shows "%s" but you selected a different service. Please correct this.',
        p_extracted_occupation
      )
    );
  end if;

  -- All checks passed
  return jsonb_build_object(
    'valid', true,
    'uan', v_uan_record.uan,
    'name', v_uan_record.name,
    'occupation', v_uan_record.occupation,
    'dob', v_uan_record.dob
  );
end;
$$;

-- Grant execute permissions
grant execute on function public.validate_provider_certificate(text, text, int) to authenticated, anon;

-- ============================================================
-- Insert sample UAN for testing (use a real 12-digit number format)
insert into public.uan_registry (uan, name, father_name, dob, gender, occupation)
values
  ('123456789012', 'Test Provider', 'Test Father', '1990-01-15', 'Male', 'Electrician'),
  ('987654321098', 'Second Provider', 'Second Father', '1985-06-20', 'Male', 'Plumber')
on conflict (uan) do nothing;
-- ============================================================
create or replace function public.register_provider(
  p_user_id          uuid,
  p_email            text,
  p_full_name        text,
  p_phone            text,
  p_city             text,
  p_state            text,
  p_service_id       integer,
  p_bio              text,
  p_years_exp        text,
  p_radius_km        integer,
  p_availability     jsonb default '[]'::jsonb,
  p_skill_ids        integer[] default '{}'::integer[],
  p_latitude         decimal(10, 8) default null,
  p_longitude        decimal(11, 8) default null,
  p_certificate_url  text default null,
  p_uan              text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_row         public.users%rowtype;
  v_provider_row     public.service_providers%rowtype;
  v_skill_id         integer;
  v_provider_id      uuid;
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

  v_provider_id := v_provider_row.id;

  if array_length(p_skill_ids, 1) > 0 then
    delete from public.provider_skills where provider_id = v_provider_row.id;
    foreach v_skill_id in array p_skill_ids loop
      insert into public.provider_skills (provider_id, skill_id)
        values (v_provider_row.id, v_skill_id)
        on conflict do nothing;
    end loop;
  end if;

  -- Mark UAN as registered by this provider if provided
  if p_uan is not null then
    update public.uan_registry
       set registered_by = v_provider_id,
           updated_at = now()
     where uan = p_uan;
  end if;

  return jsonb_build_object(
    'user',     to_jsonb(v_user_row),
    'provider', to_jsonb(v_provider_row)
  );
end;
$$;