create table if not exists public.airline_policy_snapshots_v4 (
  id uuid primary key default gen_random_uuid(),
  airline text not null,
  aliases text[] not null default '{}'::text[],
  bag_type text not null check (bag_type in ('personal','carry_on','checked')),
  max_weight_kg numeric,
  dimensions_cm jsonb,
  max_linear_cm numeric,
  allowance_note text,
  source_url text not null,
  source_title text not null,
  last_verified_at timestamptz not null,
  source_hash text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  unique(airline, bag_type, source_url)
);

alter table public.airline_policy_snapshots_v4 enable row level security;

drop policy if exists airline_policy_v4_select_authenticated on public.airline_policy_snapshots_v4;
create policy airline_policy_v4_select_authenticated on public.airline_policy_snapshots_v4 for select to authenticated using (true);
drop policy if exists airline_policy_v4_admin_insert on public.airline_policy_snapshots_v4;
create policy airline_policy_v4_admin_insert on public.airline_policy_snapshots_v4 for insert to authenticated with check (private.is_admin());
drop policy if exists airline_policy_v4_admin_update on public.airline_policy_snapshots_v4;
create policy airline_policy_v4_admin_update on public.airline_policy_snapshots_v4 for update to authenticated using (private.is_admin()) with check (private.is_admin());
drop policy if exists airline_policy_v4_admin_delete on public.airline_policy_snapshots_v4;
create policy airline_policy_v4_admin_delete on public.airline_policy_snapshots_v4 for delete to authenticated using (private.is_admin());

insert into public.airline_policy_snapshots_v4(airline,aliases,bag_type,max_weight_kg,dimensions_cm,max_linear_cm,allowance_note,source_url,source_title,last_verified_at,source_hash)
values
('JetBlue',array['jetblue','jet blue'],'personal',null,'{"length":43.2,"width":33,"height":20.32}'::jsonb,null,'One personal item. Size from official JetBlue carry-on policy.','https://www.jetblue.com/help/carry-on-bags','JetBlue Carry-On Bags','2026-08-30T22:00:00Z','jetblue-carry-20260830'),
('JetBlue',array['jetblue','jet blue'],'carry_on',null,'{"length":55.88,"width":35.56,"height":22.86}'::jsonb,null,'One carry-on and one personal item on all fares; JetBlue publishes no carry-on weight limit if the passenger can lift it.','https://www.jetblue.com/help/carry-on-bags','JetBlue Carry-On Bags','2026-08-30T22:00:00Z','jetblue-carry-20260830'),
('JetBlue',array['jetblue','jet blue'],'checked',22.68,null,158,'Standard checked-bag size/weight reference; fare-specific inclusion and fees remain separate.','https://www.jetblue.com/bag-calculator','JetBlue Bag Calculator','2026-08-30T22:00:00Z','jetblue-checked-20260830'),
('American Airlines',array['american','american airlines','aa'],'personal',null,'{"length":45,"width":35,"height":20}'::jsonb,null,'One personal item that must fit under the seat.','https://www.aa.com/web/i18n/travel-info/baggage/carry-on-baggage.html','American Airlines Carry-On Bags','2026-08-30T22:00:00Z','aa-carry-20260830'),
('American Airlines',array['american','american airlines','aa'],'carry_on',null,'{"length":56,"width":36,"height":23}'::jsonb,null,'One carry-on in addition to the personal item; aircraft/airport restrictions may differ.','https://www.aa.com/web/i18n/travel-info/baggage/carry-on-baggage.html','American Airlines Carry-On Bags','2026-08-30T22:00:00Z','aa-carry-20260830'),
('American Airlines',array['american','american airlines','aa'],'checked',23,null,158,'General Economy checked-bag size/weight reference; fare, route and seasonal restrictions remain separate.','https://www.aa.com/web/i18n/travel-info/baggage/checked-baggage-policy.html','American Airlines Checked Bag Policy','2026-08-30T22:00:00Z','aa-checked-20260830'),
('Avianca',array['avianca'],'carry_on',10,'{"length":55,"width":35,"height":25}'::jsonb,null,'Carry-on maximum; whether included depends on fare.','https://ayuda.avianca.com/hc/en-us/articles/13080259544219-What-is-carry-on-baggage-and-how-can-I-purchase-it','Avianca Carry-On Baggage','2026-08-30T22:00:00Z','avianca-carry-20260830'),
('Avianca',array['avianca'],'checked',23,null,158,'Economy checked-bag maximum reference; inclusion depends on fare.','https://ayuda.avianca.com/hc/en-us/articles/13081204585883-What-is-the-maximum-weight-and-size-for-checked-baggage','Avianca Checked Baggage','2026-08-30T22:00:00Z','avianca-checked-20260830')
on conflict (airline,bag_type,source_url) do update set
 aliases=excluded.aliases,max_weight_kg=excluded.max_weight_kg,dimensions_cm=excluded.dimensions_cm,max_linear_cm=excluded.max_linear_cm,allowance_note=excluded.allowance_note,source_title=excluded.source_title,last_verified_at=excluded.last_verified_at,source_hash=excluded.source_hash,active=true;

create or replace function public.apply_airline_bag_policy_v4()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  trip_airline text;
  policy public.airline_policy_snapshots_v4%rowtype;
begin
  if new.trip_id is null or (new.max_weight_kg is not null and new.dimensions_cm is not null) then
    return new;
  end if;
  select t.airline into trip_airline from public.trips t where t.id=new.trip_id;
  if trip_airline is null then return new; end if;
  select p.* into policy
  from public.airline_policy_snapshots_v4 p
  where p.active and p.bag_type=new.bag_type and (
    lower(trim(trip_airline))=lower(p.airline)
    or exists(select 1 from unnest(p.aliases) a where lower(trim(trip_airline))=lower(a))
  )
  order by p.last_verified_at desc limit 1;
  if found then
    if new.max_weight_kg is null then new.max_weight_kg:=policy.max_weight_kg; end if;
    if new.dimensions_cm is null then new.dimensions_cm:=policy.dimensions_cm; end if;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_apply_airline_bag_policy_v4 on public.trip_bags;
create trigger trg_apply_airline_bag_policy_v4 before insert on public.trip_bags for each row execute function public.apply_airline_bag_policy_v4();

comment on table public.airline_policy_snapshots_v4 is 'Official airline baggage policy snapshots. These are commercial carrier policies and must never be presented as TSA/FAA law.';
