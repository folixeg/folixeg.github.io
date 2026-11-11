-- Hide exact stock numbers from the public. Run ONCE in SQL Editor.
-- Customers only see in_stock (true/false). The admin (logged-in) still sees everything.
alter table public.product_variants
  add column if not exists in_stock boolean generated always as (stock_quantity > 0) stored;

revoke select on public.product_variants from anon;
grant select (id, product_id, color_name, color_code, is_active, in_stock) on public.product_variants to anon;
-- Checkout still validates the real quantity inside create_order(), so overselling remains impossible.
