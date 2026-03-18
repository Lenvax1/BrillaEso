drop policy if exists "references_owner_delete" on storage.objects;
drop policy if exists "references_delete" on storage.objects;

create policy "references_delete" on storage.objects
for delete
to authenticated
using (bucket_id = 'references' and (owner = auth.uid() or public.is_admin()));
