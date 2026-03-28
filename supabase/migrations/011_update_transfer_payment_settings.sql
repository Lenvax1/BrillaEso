insert into public.payment_settings (
  id,
  transfer_holder,
  transfer_alias,
  transfer_cbu
)
values (
  'default',
  'Gabriel Andrés Gallo',
  'gabrielgallo.61',
  '0000003100059636567122'
)
on conflict (id) do update
set
  transfer_holder = excluded.transfer_holder,
  transfer_alias = excluded.transfer_alias,
  transfer_cbu = excluded.transfer_cbu,
  updated_at = now();
