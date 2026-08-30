create table if not exists public.product_verifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  trip_id uuid references public.trips(id) on delete cascade,
  product_name text not null,
  normalized_name text,
  origin_country text not null default 'HN',
  destination_region text not null default 'US_CONTINENTAL',
  attributes jsonb not null default '{}'::jsonb,
  decision text not null check (decision in ('allowed','allowed_declare','restricted','prohibited','review')),
  risk_level text not null check (risk_level in ('low','medium','high','review')),
  declaration_required boolean not null default false,
  requirements jsonb not null default '[]'::jsonb,
  explanation text,
  source_mode text not null default 'live_official' check (source_mode in ('database','live_official','cached_official','manual_review')),
  sources jsonb not null default '[]'::jsonb,
  verified_at timestamptz not null default now(),
  expires_at timestamptz,
  can_save boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists product_verifications_user_idx on public.product_verifications(user_id, created_at desc);
create index if not exists product_verifications_trip_idx on public.product_verifications(trip_id, created_at desc);
alter table public.product_verifications enable row level security;
drop policy if exists product_verifications_owner_select on public.product_verifications;
create policy product_verifications_owner_select on public.product_verifications for select to authenticated using (user_id=(select auth.uid()) or private.is_admin());
drop policy if exists product_verifications_owner_insert on public.product_verifications;
create policy product_verifications_owner_insert on public.product_verifications for insert to authenticated with check (user_id=(select auth.uid()) or private.is_admin());
drop policy if exists product_verifications_admin_update on public.product_verifications;
create policy product_verifications_admin_update on public.product_verifications for update to authenticated using (private.is_admin()) with check (private.is_admin());
drop policy if exists product_verifications_admin_delete on public.product_verifications;
create policy product_verifications_admin_delete on public.product_verifications for delete to authenticated using (private.is_admin());
alter table public.trip_items add column if not exists verification_id uuid references public.product_verifications(id) on delete set null;
create index if not exists trip_items_verification_idx on public.trip_items(verification_id);
