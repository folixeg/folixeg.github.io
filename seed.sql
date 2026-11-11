-- Minimal starting data. Real price/stock/images are set from the admin dashboard.
insert into store_settings (id, store_name, currency, shipping_fee) values (1, 'FOLIX', 'EGP', 0) on conflict (id) do nothing;

-- Product starts INACTIVE with price 0 so nothing can be sold until you set the real price and activate it.
with p as (
  insert into products (name, slug, description, price, is_active)
  values ('FOLIX Hair Building Fibers', 'folix-hair-building-fibers', 'Microfiber hair concealer for an instantly fuller look.', 0, false)
  on conflict (slug) do nothing returning id)
insert into product_variants (product_id, color_name, color_code, stock_quantity, sku, is_active)
select id, v.n, v.c, 0, v.s, true from p, (values ('Black', '#0b0a09', 'FOLIX-BLK'), ('Brown', '#7b4126', 'FOLIX-BRN')) v(n, c, s);
