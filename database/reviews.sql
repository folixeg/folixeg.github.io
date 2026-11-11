-- Real customer reviews, added by the admin only. Run once in SQL Editor.
create table public.reviews (
  id uuid primary key default gen_random_uuid(),
  customer_name text not null check (char_length(customer_name) between 1 and 80),
  rating smallint not null default 5 check (rating between 1 and 5),
  comment text not null check (char_length(comment) between 1 and 600),
  is_published boolean not null default true,
  display_order integer not null default 0,
  created_at timestamptz not null default now()
);
alter table public.reviews enable row level security;
revoke insert, update, delete on public.reviews from anon;
create policy "public read reviews" on public.reviews for select using (is_published);
create policy "admin reviews" on public.reviews for all using (public.is_admin()) with check (public.is_admin());
