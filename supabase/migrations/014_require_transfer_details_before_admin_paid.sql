create or replace function public.admin_mark_transfer_paid(p_quote_request_id uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_is_admin boolean;
  v_reference text;
  v_holder text;
begin
  v_is_admin := public.is_admin();
  if not v_is_admin then
    raise exception 'not_admin';
  end if;

  select payment_reference
  into v_reference
  from public.quote_requests
  where id = p_quote_request_id
  for update;

  if not found then
    raise exception 'quote_request_not_found_or_invalid_state';
  end if;

  begin
    v_holder := nullif(trim(coalesce(v_reference::jsonb ->> 'holder', '')), '');
  exception
    when others then
      v_holder := nullif(trim(coalesce(v_reference, '')), '');
  end;

  if v_holder is null then
    raise exception 'transfer_details_required';
  end if;

  update public.quote_requests
  set payment_method = 'transfer',
      payment_status = 'paid',
      payment_paid_at = coalesce(payment_paid_at, now()),
      payment_verified_at = now()
  where id = p_quote_request_id
    and quoted_price is not null
    and customer_decision = 'accepted'
    and coalesce(payment_status, 'pending') in ('pending', 'failed');

  if not found then
    raise exception 'quote_request_not_found_or_invalid_state';
  end if;

  insert into public.orders (user_id, quote_request_id, status, total_amount)
  select user_id, id, 'Creado', quoted_price
  from public.quote_requests
  where id = p_quote_request_id
    and quoted_price is not null
  on conflict (quote_request_id) do update set total_amount = excluded.total_amount;
end;
$$;
