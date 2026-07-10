-- Compatibility key for the second AI with Murda paid product.

insert into public.products (key, name, subtitle, price_cents, currency, active)
values (
  'new_wave_live_builds',
  'New Wave Operator Bundle',
  'More skills. More scripts. More ways to ship.',
  9700,
  'usd',
  true
)
on conflict (key) do update
  set name = excluded.name,
      subtitle = excluded.subtitle,
      price_cents = excluded.price_cents,
      currency = excluded.currency,
      active = excluded.active,
      updated_at = now();
