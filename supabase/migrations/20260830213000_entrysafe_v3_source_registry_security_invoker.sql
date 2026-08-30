create or replace view public.regulatory_source_registry_v3_active
with (security_invoker=true)
as
select source_key,agency,title,url,last_verified_at
from public.regulatory_source_registry_v3
where active=true;

revoke all on public.regulatory_source_registry_v3_active from anon;
grant select on public.regulatory_source_registry_v3_active to authenticated;
