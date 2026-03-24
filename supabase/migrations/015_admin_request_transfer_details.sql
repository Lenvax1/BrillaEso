create or replace function public.admin_request_transfer_details(p_quote_request_id uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
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
      payment_status = 'failed',
      payment_reference = null,
      payment_receipt_url = null,
      payment_paid_at = null,
      payment_submitted_at = null,
      payment_verified_at = null
  where id = p_quote_request_id
    and quoted_price is not null
    and customer_decision = 'accepted'
    and coalesce(payment_status, 'pending') <> 'paid';

  if not found then
    raise exception 'quote_request_not_found_or_invalid_state';
  end if;
end;
$$;

grant execute on function public.admin_request_transfer_details(uuid) to authenticated;
