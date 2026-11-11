-- FOLIX schema. Run FIRST (SQL Editor), then policies.sql, then seed.sql.
create extension if not exists pgcrypto;

create or replace function public.touch_updated_at() returns trigger language plpgsql as $$
begin new.updated_at := now(); return new; end $$;

create table public.products (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 200),
  slug text not null unique check (slug ~ '^[a-z0-9-]+$'),
  description text,
  price numeric(10,2) not null check (price >= 0),
  old_price numeric(10,2) check (old_price is null or old_price > price),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.product_variants (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  color_name text not null,
  color_code text not null check (color_code ~* '^#[0-9a-f]{6}$'),
  stock_quantity integer not null default 0 check (stock_quantity >= 0),
  sku text unique,
  is_active boolean not null default true,
  unique (product_id, color_name)
);

-- product_id is nullable so gallery / banner / before-after images need no product.
create table public.product_images (
  id uuid primary key default gen_random_uuid(),
  product_id uuid references public.products(id) on delete cascade,
  variant_id uuid references public.product_variants(id) on delete set null,
  image_url text not null,
  storage_path text,
  image_type text not null default 'product'
    check (image_type in ('product','thumbnail','gallery','banner','before_after')),
  display_order integer not null default 0,
  is_primary boolean not null default false,
  created_at timestamptz not null default now()
);
create index on public.product_images (product_id, display_order);
create index on public.product_images (image_type, display_order);
create unique index one_primary_per_variant on public.product_images (coalesce(variant_id, product_id)) where is_primary;

create table public.store_settings (
  id smallint primary key default 1 check (id = 1),         -- single-row table
  store_name text not null default 'FOLIX',
  logo_url text,
  currency text not null default 'EGP',
  shipping_fee numeric(10,2) not null default 0 check (shipping_fee >= 0),
  free_shipping_threshold numeric(10,2) check (free_shipping_threshold >= 0),
  whatsapp_number text,
  contact_email text,
  announcement_text text,
  social_links jsonb not null default '{}'::jsonb,
  is_store_open boolean not null default true,
  low_stock_threshold integer not null default 5,
  updated_at timestamptz not null default now()
);

create sequence public.order_seq;
create table public.orders (
  id uuid primary key default gen_random_uuid(),
  order_number text not null unique,
  customer_name text not null,
  phone text not null check (phone ~ '^01[0125][0-9]{8}$'),
  governorate text not null,
  city text not null,
  address text not null,
  notes text,
  subtotal numeric(10,2) not null default 0,
  shipping_fee numeric(10,2) not null default 0,
  total numeric(10,2) not null default 0,
  order_status text not null default 'pending'
    check (order_status in ('pending','confirmed','processing','shipped','delivered','cancelled')),
  payment_method text not null default 'cod' check (payment_method in ('cod')), -- extend later
  payment_status text not null default 'unpaid' check (payment_status in ('unpaid','paid','refunded')),
  idempotency_key text not null unique,                      -- blocks duplicate submissions
  stock_deducted boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on public.orders (created_at desc);
create index on public.orders (order_status);
create index on public.orders (phone);

create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id uuid not null references public.products(id),
  variant_id uuid not null references public.product_variants(id),
  product_name_snapshot text not null,
  color_name_snapshot text not null,
  unit_price numeric(10,2) not null,
  quantity integer not null check (quantity > 0),
  total_price numeric(10,2) not null
);
create index on public.order_items (order_id);

create table public.order_status_history (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  from_status text, to_status text not null,
  changed_by uuid, created_at timestamptz not null default now()
);

-- Notification outbox: dashboard (Realtime) now; a worker/Edge Function can forward to WhatsApp/Telegram/email later.
create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  type text not null default 'new_order',
  payload jsonb not null,
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

-- Authorization lives here, never in the browser. Add rows manually (see README).
create table public.admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null default 'admin' check (role in ('owner','admin')),
  created_at timestamptz not null default now()
);

create trigger t_products_upd before update on public.products for each row execute function public.touch_updated_at();
create trigger t_orders_upd before update on public.orders for each row execute function public.touch_updated_at();
create trigger t_settings_upd before update on public.store_settings for each row execute function public.touch_updated_at();

create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.admin_users where user_id = auth.uid());
$$;

-- Status changes: cancelled is final; cancelling restores stock exactly once; every change is logged.
create or replace function public.on_order_status_change() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.order_status is distinct from old.order_status then
    if old.order_status = 'cancelled' then raise exception 'cancelled_is_final'; end if;
    if new.order_status = 'cancelled' and old.stock_deducted then
      update product_variants v set stock_quantity = v.stock_quantity + i.quantity
        from order_items i where i.order_id = new.id and v.id = i.variant_id;
      new.stock_deducted := false;
    end if;
    insert into order_status_history(order_id, from_status, to_status, changed_by)
      values (new.id, old.order_status, new.order_status, auth.uid());
  end if;
  return new;
end $$;
create trigger t_order_status before update on public.orders
  for each row execute function public.on_order_status_change();

-- Public checkout. All prices, stock and shipping are read from the DB; the client only sends variant ids + quantities.
-- Stock is RESERVED (deducted) at order time so two buyers can never oversell; cancelling restores it.
create or replace function public.create_order(
  p_name text, p_phone text, p_governorate text, p_city text, p_address text,
  p_notes text, p_items jsonb, p_idempotency_key text
) returns jsonb language plpgsql security definer set search_path = public as $$
declare
  s store_settings; ex orders; r record; it jsonb;
  v_phone text; v_id uuid := gen_random_uuid(); v_no text; v_qty int; v_sub numeric := 0; v_ship numeric;
  v_first text; v_totalqty int := 0;
begin
  if p_idempotency_key is null or char_length(p_idempotency_key) not between 8 and 100 then raise exception 'invalid_request'; end if;
  select * into ex from orders where idempotency_key = p_idempotency_key;
  if found then return jsonb_build_object('order_number', ex.order_number, 'total', ex.total, 'duplicate', true); end if;

  select * into s from store_settings where id = 1;
  if not found or not s.is_store_open then raise exception 'store_closed'; end if;

  v_phone := regexp_replace(regexp_replace(coalesce(p_phone,''), '[\s-]', '', 'g'), '^\+?2', '');
  if v_phone !~ '^01[0125][0-9]{8}$' then raise exception 'invalid_phone'; end if;
  p_name := btrim(coalesce(p_name,'')); p_governorate := btrim(coalesce(p_governorate,''));
  p_city := btrim(coalesce(p_city,'')); p_address := btrim(coalesce(p_address,'')); p_notes := nullif(btrim(coalesce(p_notes,'')),'');
  if char_length(p_name) not between 2 and 100 or char_length(p_governorate) not between 2 and 50
     or char_length(p_city) not between 2 and 100 or char_length(p_address) not between 5 and 300
     or char_length(coalesce(p_notes,'')) > 500 then raise exception 'invalid_fields'; end if;
  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) not between 1 and 10 then raise exception 'invalid_items'; end if;

  -- Basic spam guard: max 5 orders per phone per hour.
  if (select count(*) from orders where phone = v_phone and created_at > now() - interval '1 hour') >= 5 then raise exception 'rate_limited'; end if;

  v_no := 'FX-' || to_char(now() at time zone 'Africa/Cairo', 'YYMMDD') || '-' || lpad(nextval('order_seq')::text, 5, '0');
  insert into orders(id, order_number, customer_name, phone, governorate, city, address, notes, idempotency_key)
    values (v_id, v_no, p_name, v_phone, p_governorate, p_city, p_address, p_notes, p_idempotency_key);

  for it in select * from jsonb_array_elements(p_items) loop
    v_qty := (it->>'quantity')::int;
    if v_qty is null or v_qty not between 1 and 20 then raise exception 'invalid_quantity'; end if;
    select v.id vid, v.color_name, v.stock_quantity, v.is_active vact, p.id pid, p.name pname, p.price, p.is_active pact
      into r from product_variants v join products p on p.id = v.product_id
      where v.id = (it->>'variant_id')::uuid for update of v;   -- row lock serialises concurrent buyers
    if not found or not r.vact or not r.pact then raise exception 'product_unavailable'; end if;
    if r.stock_quantity < v_qty then raise exception 'out_of_stock:%', r.color_name; end if;
    update product_variants set stock_quantity = stock_quantity - v_qty where id = r.vid;
    insert into order_items(order_id, product_id, variant_id, product_name_snapshot, color_name_snapshot, unit_price, quantity, total_price)
      values (v_id, r.pid, r.vid, r.pname, r.color_name, r.price, v_qty, r.price * v_qty);
    v_sub := v_sub + r.price * v_qty; v_totalqty := v_totalqty + v_qty; v_first := coalesce(v_first, r.color_name);
  end loop;

  v_ship := case when s.free_shipping_threshold is not null and v_sub >= s.free_shipping_threshold then 0 else s.shipping_fee end;
  update orders set subtotal = v_sub, shipping_fee = v_ship, total = v_sub + v_ship where id = v_id;

  -- Minimal payload only: no address, no notes.
  insert into notifications(type, payload) values ('new_order', jsonb_build_object(
    'order_number', v_no, 'customer_name', p_name, 'phone', v_phone, 'color', v_first, 'quantity', v_totalqty, 'total', v_sub + v_ship));

  return jsonb_build_object('order_number', v_no, 'total', v_sub + v_ship, 'duplicate', false);
end $$;
