create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key,
  full_name text,
  phone text,
  is_admin boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists(
    select 1
    from public.profiles p
    where p.id = auth.uid() and p.is_admin = true
  );
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id)
  values (new.id)
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();

create policy "profiles_select_own" on public.profiles
for select
to authenticated
using (id = auth.uid() or public.is_admin());

create policy "profiles_update_own" on public.profiles
for update
to authenticated
using (id = auth.uid() or public.is_admin())
with check (id = auth.uid() or public.is_admin());

grant select, update on public.profiles to authenticated;

create table if not exists public.gallery_works (
  id uuid primary key default gen_random_uuid(),
  title text,
  description text,
  cover_image_url text not null,
  tags_json text,
  is_featured boolean not null default false,
  is_published boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.gallery_works enable row level security;

create policy "gallery_works_select_published" on public.gallery_works
for select
to anon, authenticated
using (is_published = true);

create policy "gallery_works_admin_all" on public.gallery_works
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

grant select on public.gallery_works to anon;
grant all privileges on public.gallery_works to authenticated;

create table if not exists public.gallery_work_images (
  id uuid primary key default gen_random_uuid(),
  work_id uuid not null references public.gallery_works(id) on delete cascade,
  image_url text not null,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists idx_gallery_work_images_work_id_order on public.gallery_work_images(work_id, sort_order);

alter table public.gallery_work_images enable row level security;

create policy "gallery_images_select_if_published" on public.gallery_work_images
for select
to anon, authenticated
using (
  exists(
    select 1 from public.gallery_works gw
    where gw.id = work_id and gw.is_published = true
  )
);

create policy "gallery_images_admin_all" on public.gallery_work_images
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

grant select on public.gallery_work_images to anon;
grant all privileges on public.gallery_work_images to authenticated;

create table if not exists public.quote_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid,
  contact_email text not null,
  contact_phone text,
  reference_image_url text not null,
  specs_json text not null,
  status text not null default 'En revisión',
  quoted_price numeric(10,2),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_quote_requests_user_id on public.quote_requests(user_id);
create index if not exists idx_quote_requests_created_at on public.quote_requests(created_at desc);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_quote_requests_updated_at on public.quote_requests;
create trigger set_quote_requests_updated_at
before update on public.quote_requests
for each row execute procedure public.set_updated_at();

alter table public.quote_requests enable row level security;

create policy "quote_requests_insert_own" on public.quote_requests
for insert
to authenticated
with check (user_id = auth.uid());

create policy "quote_requests_select_own_or_admin" on public.quote_requests
for select
to authenticated
using (user_id = auth.uid() or public.is_admin());

create policy "quote_requests_update_owner_no_price" on public.quote_requests
for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid() and quoted_price is null);

create policy "quote_requests_admin_all" on public.quote_requests
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

grant all privileges on public.quote_requests to authenticated;

create table if not exists public.quote_request_ai_jobs (
  id uuid primary key default gen_random_uuid(),
  quote_request_id uuid not null references public.quote_requests(id) on delete cascade,
  created_by_user_id uuid references public.profiles(id),
  provider text not null default 'fal',
  provider_request_id text,
  job_type text not null check (job_type in ('preview','edit')),
  status text not null check (status in ('queued','in_progress','completed','failed')),
  input_image_url text not null,
  output_image_url text,
  prompt text,
  quality text not null default 'mid' check (quality in ('mid')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_ai_jobs_quote_request_id_created_at on public.quote_request_ai_jobs(quote_request_id, created_at desc);
create index if not exists idx_ai_jobs_provider_request_id on public.quote_request_ai_jobs(provider_request_id);

drop trigger if exists set_ai_jobs_updated_at on public.quote_request_ai_jobs;
create trigger set_ai_jobs_updated_at
before update on public.quote_request_ai_jobs
for each row execute procedure public.set_updated_at();

alter table public.quote_request_ai_jobs enable row level security;

create policy "ai_jobs_select_owner_or_admin" on public.quote_request_ai_jobs
for select
to authenticated
using (
  public.is_admin() or
  exists(
    select 1 from public.quote_requests qr
    where qr.id = quote_request_id and qr.user_id = auth.uid()
  )
);

create policy "ai_jobs_insert_owner_or_admin" on public.quote_request_ai_jobs
for insert
to authenticated
with check (
  public.is_admin() or
  (created_by_user_id = auth.uid() and exists(
    select 1 from public.quote_requests qr
    where qr.id = quote_request_id and qr.user_id = auth.uid()
  ))
);

create policy "ai_jobs_admin_update" on public.quote_request_ai_jobs
for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

grant all privileges on public.quote_request_ai_jobs to authenticated;

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid,
  quote_request_id uuid,
  status text not null default 'Creado',
  total_amount numeric(10,2),
  shipping_json text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_orders_user_id on public.orders(user_id);
create index if not exists idx_orders_created_at on public.orders(created_at desc);

drop trigger if exists set_orders_updated_at on public.orders;
create trigger set_orders_updated_at
before update on public.orders
for each row execute procedure public.set_updated_at();

alter table public.orders enable row level security;

create policy "orders_select_own_or_admin" on public.orders
for select
to authenticated
using (user_id = auth.uid() or public.is_admin());

create policy "orders_admin_all" on public.orders
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

grant all privileges on public.orders to authenticated;

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  title text not null,
  body text not null,
  link_url text,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_notifications_user_id_created_at on public.notifications(user_id, created_at desc);

alter table public.notifications enable row level security;

create policy "notifications_select_own_or_admin" on public.notifications
for select
to authenticated
using (user_id = auth.uid() or public.is_admin());

create policy "notifications_update_own" on public.notifications
for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

create policy "notifications_admin_insert" on public.notifications
for insert
to authenticated
with check (public.is_admin());

create policy "notifications_admin_delete" on public.notifications
for delete
to authenticated
using (public.is_admin());

grant all privileges on public.notifications to authenticated;

insert into storage.buckets (id, name, public)
values ('gallery', 'gallery', true)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('references', 'references', false)
on conflict (id) do nothing;

drop policy if exists "gallery_public_read" on storage.objects;
create policy "gallery_public_read" on storage.objects
for select
to anon, authenticated
using (bucket_id = 'gallery');

drop policy if exists "gallery_admin_write" on storage.objects;
create policy "gallery_admin_write" on storage.objects
for all
to authenticated
using (bucket_id = 'gallery' and public.is_admin())
with check (bucket_id = 'gallery' and public.is_admin());

drop policy if exists "references_owner_or_admin_read" on storage.objects;
create policy "references_owner_or_admin_read" on storage.objects
for select
to authenticated
using (bucket_id = 'references' and (owner = auth.uid() or public.is_admin()));

drop policy if exists "references_owner_write" on storage.objects;
create policy "references_owner_write" on storage.objects
for insert
to authenticated
with check (bucket_id = 'references' and owner = auth.uid());

drop policy if exists "references_owner_update" on storage.objects;
create policy "references_owner_update" on storage.objects
for update
to authenticated
using (bucket_id = 'references' and owner = auth.uid())
with check (bucket_id = 'references' and owner = auth.uid());

drop policy if exists "references_owner_delete" on storage.objects;
create policy "references_owner_delete" on storage.objects
for delete
to authenticated
using (bucket_id = 'references' and owner = auth.uid());

