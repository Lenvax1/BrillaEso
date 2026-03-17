alter table public.quote_requests
add column if not exists payment_method text;

alter table public.quote_requests
add column if not exists payment_reference text;

alter table public.quote_requests
add column if not exists payment_receipt_url text;

alter table public.quote_requests
add column if not exists payment_submitted_at timestamptz;

alter table public.quote_requests
add column if not exists payment_verified_at timestamptz;

create table if not exists public.payment_settings (
  id text primary key,
  transfer_holder text,
  transfer_bank text,
  transfer_alias text,
  transfer_cbu text,
  transfer_cuit text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists set_payment_settings_updated_at on public.payment_settings;
create trigger set_payment_settings_updated_at
before update on public.payment_settings
for each row execute procedure public.set_updated_at();

insert into public.payment_settings (id, transfer_holder, transfer_bank, transfer_alias, transfer_cbu, transfer_cuit)
values ('default', null, null, null, null, null)
on conflict (id) do nothing;

alter table public.payment_settings enable row level security;

drop policy if exists "payment_settings_select" on public.payment_settings;
create policy "payment_settings_select" on public.payment_settings
for select
to authenticated
using (true);

drop policy if exists "payment_settings_admin_update" on public.payment_settings;
create policy "payment_settings_admin_update" on public.payment_settings
for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

grant select, update on public.payment_settings to authenticated;

do $$
begin
  insert into storage.buckets (id, name, public)
  values ('receipts', 'receipts', false)
  on conflict (id) do nothing;
exception
  when undefined_table then
    null;
end $$;

drop policy if exists "receipts_owner_select" on storage.objects;
create policy "receipts_owner_select" on storage.objects
for select
to authenticated
using (bucket_id = 'receipts' and owner = auth.uid());

drop policy if exists "receipts_owner_insert" on storage.objects;
create policy "receipts_owner_insert" on storage.objects
for insert
to authenticated
with check (bucket_id = 'receipts' and owner = auth.uid());

drop policy if exists "receipts_owner_delete" on storage.objects;
create policy "receipts_owner_delete" on storage.objects
for delete
to authenticated
using (bucket_id = 'receipts' and owner = auth.uid());

create or replace function public.customer_accept_quote(p_quote_request_id uuid)
returns void
language plpgsql
security definer
as $$
declare
  v_user uuid;
begin
  v_user := auth.uid();
  if v_user is null then
    raise exception 'not_authenticated';
  end if;

  update public.quote_requests
  set customer_decision = 'accepted',
      decision_at = now(),
      payment_method = coalesce(payment_method, 'transfer'),
      payment_provider = null,
      payment_status = coalesce(payment_status, 'pending')
  where id = p_quote_request_id
    and user_id = v_user
    and quoted_price is not null
    and (customer_decision is null or customer_decision = 'accepted');

  insert into public.orders (user_id, quote_request_id, status, total_amount)
  select user_id, id, 'Creado', quoted_price
  from public.quote_requests
  where id = p_quote_request_id
    and user_id = v_user
    and quoted_price is not null
  on conflict (quote_request_id) do nothing;
end;
$$;

create or replace function public.customer_reject_quote(p_quote_request_id uuid)
returns void
language plpgsql
security definer
as $$
declare
  v_user uuid;
begin
  v_user := auth.uid();
  if v_user is null then
    raise exception 'not_authenticated';
  end if;

  update public.quote_requests
  set customer_decision = 'rejected',
      decision_at = now(),
      payment_status = null,
      payment_method = null,
      payment_reference = null,
      payment_receipt_url = null,
      payment_submitted_at = null,
      payment_verified_at = null,
      status = 'Cancelado'
  where id = p_quote_request_id
    and user_id = v_user
    and quoted_price is not null;
end;
$$;

create or replace function public.customer_submit_transfer_receipt(
  p_quote_request_id uuid,
  p_receipt_url text,
  p_reference text
)
returns void
language plpgsql
security definer
as $$
declare
  v_user uuid;
begin
  v_user := auth.uid();
  if v_user is null then
    raise exception 'not_authenticated';
  end if;

  update public.quote_requests
  set payment_method = 'transfer',
      payment_reference = nullif(trim(p_reference), ''),
      payment_receipt_url = nullif(trim(p_receipt_url), ''),
      payment_submitted_at = now(),
      payment_status = 'pending'
  where id = p_quote_request_id
    and user_id = v_user
    and quoted_price is not null
    and customer_decision = 'accepted';
end;
$$;

create or replace function public.admin_mark_transfer_paid(p_quote_request_id uuid)
returns void
language plpgsql
security definer
as $$
declare
  v_is_admin boolean;
begin
  v_is_admin := public.is_admin();
  if not v_is_admin then
    raise exception 'not_admin';
  end if;

  update public.quote_requests
  set payment_method = 'transfer',
      payment_status = 'paid',
      payment_paid_at = coalesce(payment_paid_at, now()),
      payment_verified_at = now()
  where id = p_quote_request_id
    and quoted_price is not null;

  insert into public.orders (user_id, quote_request_id, status, total_amount)
  select user_id, id, 'Creado', quoted_price
  from public.quote_requests
  where id = p_quote_request_id
    and quoted_price is not null
  on conflict (quote_request_id) do update set total_amount = excluded.total_amount;
end;
$$;

grant execute on function public.customer_accept_quote(uuid) to authenticated;
grant execute on function public.customer_reject_quote(uuid) to authenticated;
grant execute on function public.customer_submit_transfer_receipt(uuid, text, text) to authenticated;
grant execute on function public.admin_mark_transfer_paid(uuid) to authenticated;

