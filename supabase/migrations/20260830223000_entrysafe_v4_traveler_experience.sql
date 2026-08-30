alter table public.trip_items
  add column if not exists answers_v4 jsonb not null default '{}'::jsonb,
  add column if not exists item_weight_grams_v4 numeric,
  add column if not exists packed_at_v4 timestamptz,
  add column if not exists declaration_name_en_v4 text;

alter table public.trip_bags
  add column if not exists max_weight_kg numeric,
  add column if not exists dimensions_cm jsonb,
  add column if not exists sort_order integer not null default 0;

create index if not exists idx_trip_items_trip_packed_v4 on public.trip_items(trip_id, packed);
create index if not exists idx_trip_items_trip_bag_v4 on public.trip_items(trip_id, bag_id);
create index if not exists idx_trip_bags_trip_sort_v4 on public.trip_bags(trip_id, sort_order, created_at);

create table if not exists public.trip_declaration_snapshots_v4 (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  catalog_version text not null,
  engine_version text,
  items jsonb not null default '[]'::jsonb,
  source_snapshot jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.trip_declaration_snapshots_v4 enable row level security;

drop policy if exists trip_declaration_snapshots_v4_select_own on public.trip_declaration_snapshots_v4;
create policy trip_declaration_snapshots_v4_select_own on public.trip_declaration_snapshots_v4 for select using (user_id = auth.uid());
drop policy if exists trip_declaration_snapshots_v4_insert_own on public.trip_declaration_snapshots_v4;
create policy trip_declaration_snapshots_v4_insert_own on public.trip_declaration_snapshots_v4 for insert with check (user_id = auth.uid() and exists(select 1 from public.trips t where t.id=trip_id and t.user_id=auth.uid()));
drop policy if exists trip_declaration_snapshots_v4_delete_own on public.trip_declaration_snapshots_v4;
create policy trip_declaration_snapshots_v4_delete_own on public.trip_declaration_snapshots_v4 for delete using (user_id = auth.uid());

create index if not exists idx_trip_declaration_snapshots_v4_trip on public.trip_declaration_snapshots_v4(trip_id, created_at desc);

comment on column public.trip_items.answers_v4 is 'Minimal traveler answers used to resolve regulatory ambiguity without long forms.';
comment on column public.trip_items.item_weight_grams_v4 is 'Known or traveler-supplied physical weight used for packing totals; never guessed when unknown.';
comment on table public.trip_declaration_snapshots_v4 is 'Auditable bilingual declaration snapshot generated from the traveler selection and official-source evaluation.';
