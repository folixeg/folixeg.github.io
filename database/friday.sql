-- Friday countdown switches (controlled from the dashboard → Settings). Run ONCE.
alter table public.store_settings
  add column if not exists friday_promo boolean not null default false,
  add column if not exists friday_theme text not null default 'black' check (friday_theme in ('black','white')),
  add column if not exists friday_text text;
