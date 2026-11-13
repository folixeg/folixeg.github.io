-- Anonymous visitor counter (no names, no IPs). Run ONCE in SQL Editor.
create table if not exists public.site_visitors (
  visitor_id text primary key,
  first_seen timestamptz not null default now(),
  last_seen timestamptz not null default now(),
  last_path text,
  device text,
  source text,
  visits integer not null default 1
);
alter table public.site_visitors enable row level security;
revoke all on public.site_visitors from anon, authenticated;   -- nobody reads the table directly

-- The website reports a visit (random id stored in the visitor's browser).
create or replace function public.track_visit(p_visitor text, p_path text, p_device text, p_source text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if p_visitor is null or p_visitor !~ '^[0-9a-f-]{36}$' then return; end if;
  insert into site_visitors(visitor_id, last_path, device, source)
  values (p_visitor, left(coalesce(p_path, 'index.html'), 80),
          case when p_device in ('mobile', 'desktop') then p_device else 'desktop' end,
          left(coalesce(nullif(p_source, ''), 'direct'), 40))
  on conflict (visitor_id) do update set
    visits = site_visitors.visits + case when site_visitors.last_seen < now() - interval '30 minutes' then 1 else 0 end,
    last_seen = now(), last_path = excluded.last_path;
end $$;

-- Only the admin can read the numbers.
create or replace function public.visitor_stats() returns jsonb
language plpgsql security definer set search_path = public as $$
declare r jsonb;
begin
  if not public.is_admin() then raise exception 'forbidden'; end if;
  select jsonb_build_object(
    'online', (select count(*) from site_visitors where last_seen > now() - interval '2 minutes'),
    'today',  (select count(*) from site_visitors where last_seen >= (date_trunc('day', now() at time zone 'Africa/Cairo') at time zone 'Africa/Cairo')),
    'week',   (select count(*) from site_visitors where last_seen >= now() - interval '7 days'),
    'total',  (select count(*) from site_visitors),
    'online_list', coalesce((select jsonb_agg(jsonb_build_object('page', last_path, 'device', device, 'source', source, 'last', last_seen) order by last_seen desc)
                             from (select * from site_visitors where last_seen > now() - interval '2 minutes' order by last_seen desc limit 30) s), '[]'::jsonb)
  ) into r;
  return r;
end $$;

revoke execute on function public.track_visit(text, text, text, text) from public;
revoke execute on function public.visitor_stats() from public, anon;
grant execute on function public.track_visit(text, text, text, text) to anon, authenticated;
grant execute on function public.visitor_stats() to authenticated;
