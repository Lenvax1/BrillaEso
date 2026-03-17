alter table public.quote_requests
add column if not exists customer_decision text;

alter table public.quote_requests
add column if not exists decision_at timestamptz;

alter table public.quote_requests
add column if not exists payment_provider text;

alter table public.quote_requests
add column if not exists payment_status text;

alter table public.quote_requests
add column if not exists payment_preference_id text;

alter table public.quote_requests
add column if not exists payment_id text;

alter table public.quote_requests
add column if not exists payment_paid_at timestamptz;

create index if not exists idx_quote_requests_payment_preference_id on public.quote_requests(payment_preference_id);
create index if not exists idx_quote_requests_payment_id on public.quote_requests(payment_id);

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'orders_quote_request_unique'
      and conrelid = 'public.orders'::regclass
  ) then
    alter table public.orders add constraint orders_quote_request_unique unique (quote_request_id);
  end if;
end $$;
