alter table public.trip_items add column if not exists catalog_key_v3 text;
alter table public.trip_items add column if not exists profile_key_v3 text;
alter table public.trip_items add column if not exists quantity_value numeric(14,4);
alter table public.trip_items add column if not exists quantity_unit text;
alter table public.trip_items add column if not exists package_count numeric(10,2);
alter table public.trip_items add column if not exists package_size_value numeric(14,4);
alter table public.trip_items add column if not exists package_size_unit text;
alter table public.trip_items add column if not exists abv_percent numeric(6,2);
alter table public.trip_items add column if not exists battery_wh numeric(10,2);
alter table public.trip_items add column if not exists battery_mah numeric(12,2);
alter table public.trip_items add column if not exists battery_voltage numeric(8,3);
alter table public.trip_items add column if not exists days_supply integer;
alter table public.trip_items add column if not exists evaluation_v3 jsonb not null default '{}'::jsonb;
alter table public.trip_items add column if not exists source_snapshot_v3 jsonb not null default '[]'::jsonb;
alter table public.trip_items add column if not exists recommended_bag_v3 text;
alter table public.trip_items add column if not exists selection_batch_id uuid;
alter table public.trips add column if not exists entry_state text;
create table if not exists public.trip_selection_batches_v3(
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  item_count integer not null default 0,
  summary jsonb not null default '{}'::jsonb,
  aggregate_checks jsonb not null default '[]'::jsonb,
  source_snapshot jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists trip_selection_batches_v3_user_trip_idx on public.trip_selection_batches_v3(user_id,trip_id,created_at desc);
create index if not exists trip_items_catalog_v3_idx on public.trip_items(user_id,trip_id,catalog_key_v3);
alter table public.trip_selection_batches_v3 enable row level security;
drop policy if exists trip_selection_batches_v3_owner on public.trip_selection_batches_v3;
create policy trip_selection_batches_v3_owner on public.trip_selection_batches_v3 for all to authenticated using(user_id=(select auth.uid())) with check(user_id=(select auth.uid()));
grant select,insert,update,delete on public.trip_selection_batches_v3 to authenticated;
