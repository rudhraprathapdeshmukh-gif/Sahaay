-- ============================================================
-- 0100: register_provider with certificate_url support
-- ============================================================
-- Adds p_certificate_url to public.register_provider so the
-- provider's uploaded certificate URL (from storage bucket
-- 'provider-certificates') is persisted to
-- service_providers.certificate_url during registration.
-- Runs after 0099 so it is the final definition on a fresh DB.

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