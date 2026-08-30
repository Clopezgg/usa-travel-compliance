alter table public.trip_items add column if not exists presentations_v3 jsonb not null default '[]'::jsonb;
create unique index if not exists trip_items_v3_unique_catalog_per_trip on public.trip_items(user_id,trip_id,catalog_key_v3) where catalog_key_v3 is not null;
