-- =============================================================
-- Sahaay — Migration to fix authentication and RLS issues
-- =============================================================

-- 1. Add missing INSERT RLS policy for public.users
-- This policy allows an authenticated user to insert their own profile into the public.users table.
-- It's crucial for the signUp flow and the auto-heal mechanism in signIn.
create policy "users insert own"
  on public.users
  for insert
  with check (auth.uid() = id);

-- 2. Update the public.register_provider function
-- This function is a security definer that handles atomic creation/update of
-- user and provider profiles, bypassing RLS.
-- We are modifying it to also accept and insert skill IDs into public.provider_skills.
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
  p_skill_ids      integer[] default '{}'::integer[] -- New parameter for skill IDs
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_row      public.users%rowtype;
  v_provider_row  public.service_providers%rowtype;
begin
  -- Upsert public.users row
  insert into public.users (id, email, full_name, phone, city, state, role)
    values (p_user_id, p_email, p_full_name, p_phone, p_city, p_state, 'provider')
    on conflict (id) do update
      set full_name = excluded.full_name,
          phone     = excluded.phone,
          city      = excluded.city,
          state     = excluded.state,
          role      = excluded.role
    returning * into v_user_row;

  -- Upsert service_providers row
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

  -- Handle provider_skills: Delete existing and insert new ones
  if array_length(p_skill_ids, 1) > 0 then
    delete from public.provider_skills where provider_id = v_provider_row.id;
    insert into public.provider_skills (provider_id, skill_id)
    select v_provider_row.id, unnest(p_skill_ids);
  end if;

  return jsonb_build_object('user', to_jsonb(v_user_row),
                            'provider', to_jsonb(v_provider_row));
end;
$$;

-- Note: No changes to frontend needed for this function, as src/lib/providers.ts
-- already passes p_skill_ids to the RPC and has a client-side fallback.
-- Once this migration is applied, the RPC will handle skills directly,
-- making the fallback less likely to be triggered for skill syncing.
