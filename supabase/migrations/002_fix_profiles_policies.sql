drop policy if exists "profiles_update_own" on public.profiles;

drop policy if exists "profiles_insert_own" on public.profiles;

create policy "profiles_insert_own" on public.profiles
for insert
to authenticated
with check (id = auth.uid() and is_admin = false);

create policy "profiles_update_own_non_admin" on public.profiles
for update
to authenticated
using (id = auth.uid())
with check (id = auth.uid() and is_admin = false);

create policy "profiles_update_admin" on public.profiles
for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

grant insert, update, select on public.profiles to authenticated;
