drop index if exists public.trip_items_v3_unique_catalog_per_trip;
create unique index if not exists trip_items_v3_unique_catalog_per_trip on public.trip_items(user_id,trip_id,catalog_key_v3);
