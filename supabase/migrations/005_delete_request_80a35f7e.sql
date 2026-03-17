delete from public.notifications
where link_url like '/mis-pedidos/80a35f7e%';

delete from public.orders
where id::text like '80a35f7e%'
   or quote_request_id::text like '80a35f7e%';

delete from public.quote_requests
where id::text like '80a35f7e%';
