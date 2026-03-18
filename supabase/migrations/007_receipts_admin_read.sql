drop policy if exists "receipts_admin_select" on storage.objects;
create policy "receipts_admin_select" on storage.objects
for select
to authenticated
using (bucket_id = 'receipts' and public.is_admin());

