alter table public.product_verifications add column if not exists classification_method text;
alter table public.product_verifications add column if not exists classification_confidence numeric(5,4);
alter table public.product_verifications add column if not exists classified_catalog_item_id uuid references public.catalog_items(id) on delete set null;
create index if not exists product_verifications_classified_catalog_idx on public.product_verifications(classified_catalog_item_id);