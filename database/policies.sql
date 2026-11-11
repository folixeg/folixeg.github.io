-- FOLIX security. Run AFTER schema.sql. Public = read-only catalog; orders only via create_order().
alter table products enable row level security;
alter table product_variants enable row level security;
alter table product_images enable row level security;
alter table store_settings enable row level security;
alter table orders enable row level security;
alter table order_items enable row level security;
alter table order_status_history enable row level security;
alter table notifications enable row level security;
alter table admin_users enable row level security;

-- Defense in depth: the public roles can never touch private tables, even if a policy is added by mistake.
revoke all on orders, order_items, order_status_history, notifications, admin_users from anon;
revoke insert, update, delete on products, product_variants, product_images, store_settings from anon;

revoke execute on function create_order(text,text,text,text,text,text,jsonb,text) from public;
grant  execute on function create_order(text,text,text,text,text,text,jsonb,text) to anon, authenticated;
grant  execute on function is_admin() to anon, authenticated;

-- Public read (active catalog only)
create policy "public read products" on products for select using (is_active);
create policy "public read variants" on product_variants for select
  using (is_active and exists (select 1 from products p where p.id = product_id and p.is_active));
create policy "public read images" on product_images for select
  using (product_id is null or exists (select 1 from products p where p.id = product_id and p.is_active));
create policy "public read settings" on store_settings for select using (true);

-- Admin full control (role checked in the DB via is_admin(), never from the browser)
create policy "admin products" on products for all using (is_admin()) with check (is_admin());
create policy "admin variants" on product_variants for all using (is_admin()) with check (is_admin());
create policy "admin images" on product_images for all using (is_admin()) with check (is_admin());
create policy "admin settings" on store_settings for all using (is_admin()) with check (is_admin());
create policy "admin orders read" on orders for select using (is_admin());
create policy "admin orders update" on orders for update using (is_admin()) with check (is_admin());
create policy "admin items read" on order_items for select using (is_admin());
create policy "admin history read" on order_status_history for select using (is_admin());
create policy "admin notif read" on notifications for select using (is_admin());
create policy "admin notif update" on notifications for update using (is_admin()) with check (is_admin());
create policy "self admin row" on admin_users for select using (user_id = auth.uid());

-- Storage: public bucket for images, only admins may write.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('folix-media', 'folix-media', true, 5242880, array['image/jpeg','image/png','image/webp'])
on conflict (id) do nothing;
create policy "media public read" on storage.objects for select using (bucket_id = 'folix-media');
create policy "media admin insert" on storage.objects for insert with check (bucket_id = 'folix-media' and public.is_admin());
create policy "media admin update" on storage.objects for update using (bucket_id = 'folix-media' and public.is_admin());
create policy "media admin delete" on storage.objects for delete using (bucket_id = 'folix-media' and public.is_admin());

-- Realtime: new-order notifications reach the dashboard (RLS still applies: only admins can read).
alter publication supabase_realtime add table notifications;
alter publication supabase_realtime add table orders;
