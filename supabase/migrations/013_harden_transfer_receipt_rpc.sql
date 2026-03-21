create or replace function public.customer_submit_transfer_receipt(
  p_quote_request_id uuid,
  p_receipt_url text,
  p_reference text
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user uuid;
  v_payload jsonb;
  v_holder text;
  v_last4 text;
  v_receipt_url text;
begin
  v_user := auth.uid();
  if v_user is null then
    raise exception 'not authenticated';
  end if;

  v_receipt_url := nullif(trim(p_receipt_url), '');

  begin
    v_payload := coalesce(nullif(trim(p_reference), '')::jsonb, '{}'::jsonb);
  exception
    when others then
      v_payload := '{}'::jsonb;
  end;

  v_holder := nullif(trim(coalesce(v_payload ->> 'holder', '')), '');
  v_last4 := nullif(regexp_replace(coalesce(v_payload ->> 'last4', ''), '[^0-9]', '', 'g'), '');

  if v_holder is null then
    raise exception 'holder_required';
  end if;
  if v_last4 is not null and char_length(v_last4) <> 4 then
    raise exception 'last4_invalid';
  end if;

  update public.quote_requests
  set payment_method = 'transfer',
      payment_provider = null,
      payment_preference_id = null,
      payment_id = null,
      payment_paid_at = null,
      payment_reference = jsonb_build_object('holder', v_holder, 'last4', v_last4)::text,
      payment_receipt_url = v_receipt_url,
      payment_submitted_at = now(),
      payment_verified_at = null,
      payment_status = 'pending'
  where id = p_quote_request_id
    and user_id = v_user
    and quoted_price is not null
    and customer_decision = 'accepted'
    and coalesce(payment_status, 'pending') in ('pending', 'failed');

  if not found then
    raise exception 'quote_request_not_found_or_invalid_state';
  end if;
end;
$$;
