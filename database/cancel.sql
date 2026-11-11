-- Customer self-cancel without an account. Run ONCE in SQL Editor (after the main setup).
-- Each new order gets a random secret; only its SHA-256 hash is stored. Cancelling needs order number + secret.
alter table public.orders add column if not exists cancel_token_hash text;

create or replace function public.place_order(
  p_name text, p_phone text, p_governorate text, p_city text, p_address text,
  p_notes text, p_items jsonb, p_idempotency_key text
) returns jsonb language plpgsql security definer set search_path = public as $$
declare r jsonb; tok text;
begin
  r := public.create_order(p_name, p_phone, p_governorate, p_city, p_address, p_notes, p_items, p_idempotency_key);
  if coalesce((r->>'duplicate')::boolean, false) then return r; end if;   -- a repeated submit never reveals a new secret
  tok := replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', '');
  update orders set cancel_token_hash = encode(sha256(convert_to(tok, 'UTF8')), 'hex') where order_number = r->>'order_number';
  return r || jsonb_build_object('cancel_token', tok);
end $$;

-- Allowed only while the order is still pending or confirmed. The existing trigger restores stock once and logs the change.
create or replace function public.cancel_my_order(p_order_number text, p_token text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare o orders;
begin
  select * into o from orders where order_number = p_order_number for update;
  if not found or o.cancel_token_hash is null
     or o.cancel_token_hash <> encode(sha256(convert_to(coalesce(p_token, ''), 'UTF8')), 'hex') then raise exception 'invalid_request'; end if;
  if o.order_status = 'cancelled' then return jsonb_build_object('status', 'cancelled'); end if;
  if o.order_status not in ('pending', 'confirmed') then raise exception 'too_late'; end if;
  update orders set order_status = 'cancelled' where id = o.id;
  insert into notifications(type, payload) values ('order_cancelled', jsonb_build_object('order_number', o.order_number, 'customer_name', o.customer_name));
  return jsonb_build_object('status', 'cancelled');
end $$;

-- Checkout now goes through place_order only.
revoke execute on function public.create_order(text,text,text,text,text,text,jsonb,text) from anon, authenticated, public;
revoke execute on function public.place_order(text,text,text,text,text,text,jsonb,text) from public;
revoke execute on function public.cancel_my_order(text,text) from public;
grant execute on function public.place_order(text,text,text,text,text,text,jsonb,text) to anon, authenticated;
grant execute on function public.cancel_my_order(text,text) to anon, authenticated;
