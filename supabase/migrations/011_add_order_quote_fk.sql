alter table public.orders
add constraint orders_quote_request_id_fkey
foreign key (quote_request_id)
references public.quote_requests(id)
on delete set null;
