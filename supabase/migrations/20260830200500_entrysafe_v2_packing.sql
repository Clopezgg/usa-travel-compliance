alter table public.trip_items add column if not exists packed boolean not null default false;
alter table public.trip_items add column if not exists item_group text not null default 'regulated';
alter table public.trip_items add column if not exists regulatory_required boolean not null default true;
alter table public.trip_items add column if not exists packing_notes text;
create index if not exists trip_items_packed_idx on public.trip_items(user_id, trip_id, packed);
