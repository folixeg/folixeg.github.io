-- A free-shipping threshold of 0 would make EVERY order free. From now on 0 (or less) means "no free shipping".
update public.store_settings set free_shipping_threshold = null where free_shipping_threshold <= 0;

create or replace function public.clean_shipping() returns trigger language plpgsql as $$
begin
  if new.free_shipping_threshold is not null and new.free_shipping_threshold <= 0 then new.free_shipping_threshold := null; end if;
  return new;
end $$;
drop trigger if exists t_clean_shipping on public.store_settings;
create trigger t_clean_shipping before insert or update on public.store_settings for each row execute function public.clean_shipping();
