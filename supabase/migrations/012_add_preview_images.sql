-- Add preview image column to quote_requests
alter table public.quote_requests
add column preview_image_url text;

-- Add image url column to orders
alter table public.orders
add column image_url text;

-- Create previews bucket
insert into storage.buckets (id, name, public)
values ('previews', 'previews', false)
on conflict (id) do nothing;

-- Policies for previews bucket
drop policy if exists "previews_select" on storage.objects;
create policy "previews_select" on storage.objects
for select
to authenticated
using (bucket_id = 'previews');

drop policy if exists "previews_admin_all" on storage.objects;
create policy "previews_admin_all" on storage.objects
for all
to authenticated
using (bucket_id = 'previews' and public.is_admin());
