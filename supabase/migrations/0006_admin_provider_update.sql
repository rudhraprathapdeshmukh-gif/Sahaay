-- Allow admins to update service_providers (for verification)
create policy "admin update providers" on public.service_providers
  for update using (public.is_admin());
