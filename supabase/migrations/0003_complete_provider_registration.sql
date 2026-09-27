-- Atomic stored procedure: creates user profile AND provider profile in one call.
-- security definer bypasses RLS so the insert always succeeds regardless of
-- the calling user's RLS context (avoids 401 timing issues after auth.signUp).

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
  p_availability   jsonb default '[]'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_row    public.users%rowtype;
  v_provider_row public.service_providers%rowtype;
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

  return jsonb_build_object('user',    to_jsonb(v_user_row),
                            'provider', to_jsonb(v_provider_row));
end;
$$;
