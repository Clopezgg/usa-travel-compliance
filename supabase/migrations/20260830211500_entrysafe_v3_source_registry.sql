create table if not exists public.regulatory_source_registry_v3(
  source_key text primary key,
  agency text not null,
  title text not null,
  url text not null,
  source_class text not null default 'official_us_government',
  active boolean not null default true,
  last_verified_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.regulatory_source_registry_v3 enable row level security;
drop policy if exists regulatory_source_registry_v3_read on public.regulatory_source_registry_v3;
create policy regulatory_source_registry_v3_read
  on public.regulatory_source_registry_v3
  for select to authenticated
  using(active=true);

revoke insert,update,delete on public.regulatory_source_registry_v3 from authenticated,anon;
grant select on public.regulatory_source_registry_v3 to authenticated;
grant select on public.regulatory_source_registry_v3 to service_role;

create index if not exists regulatory_source_registry_v3_agency_idx
  on public.regulatory_source_registry_v3(agency,active);

create or replace function public.touch_regulatory_source_registry_v3()
returns trigger
language plpgsql
set search_path=public
as $$
begin
  new.updated_at=now();
  return new;
end
$$;

drop trigger if exists trg_regulatory_source_registry_v3_updated_at on public.regulatory_source_registry_v3;
create trigger trg_regulatory_source_registry_v3_updated_at
before update on public.regulatory_source_registry_v3
for each row execute function public.touch_regulatory_source_registry_v3();

comment on table public.regulatory_source_registry_v3 is
'EntrySafe V3 official US government source registry used for regulatory traceability.';

insert into public.regulatory_source_registry_v3(source_key,agency,title,url,last_verified_at) values
('APHIS_GENERAL','USDA-APHIS','Traveling From Another Country','https://www.aphis.usda.gov/traveling-with-ag-products/another-country',now()),
('APHIS_MEAT','USDA-APHIS','Meats, Poultry, and Seafood','https://www.aphis.usda.gov/traveling-with-ag-products/meats-poultry-seafood',now()),
('APHIS_DAIRY','USDA-APHIS','Milk, Dairy, and Egg Products','https://www.aphis.usda.gov/traveling-with-ag-products/milk-dairy-eggs',now()),
('APHIS_PRODUCE','USDA-APHIS','Fruits and Vegetables','https://www.aphis.usda.gov/traveling-with-ag-products/fruits-vegetables',now()),
('APHIS_PANTRY','USDA-APHIS','Coffee, Teas, Honey, Nuts, and Spices','https://www.aphis.usda.gov/traveling-with-ag-products/coffee-tea-honey-nuts-spices',now()),
('APHIS_PLANTS','USDA-APHIS','Plants, Plant Parts, Cut Flowers, and Seeds','https://www.aphis.usda.gov/traveling-with-ag-products/plants-plant-parts',now()),
('APHIS_SOIL','USDA-APHIS','Soil and Soil-Related Products','https://www.aphis.usda.gov/traveling-with-ag-products/soil',now()),
('APHIS_SOUVENIRS','USDA-APHIS','Souvenirs','https://www.aphis.usda.gov/traveling-with-ag-products/souvenirs',now()),
('APHIS_HEALTH','USDA-APHIS','Region Health Status - Animals','https://www.aphis.usda.gov/regionalization-evaluation-services/region-health-status',now()),
('ACIR','USDA-APHIS','Agricultural Commodity Import Requirements','https://acir.aphis.usda.gov/',now()),
('CBP_DECLARE','CBP','Articles to Declare','https://www.help.cbp.gov/s/article/Article-1909?language=es',now()),
('CBP_ALCOHOL','CBP','Alcohol for Personal Use','https://www.help.cbp.gov/s/article/Article-1395?language=en_US',now()),
('CBP_DUTY','CBP','Customs Duty Information','https://www.cbp.gov/travel/international-visitors/know-before-you-visit/customs-duty-information',now()),
('CBP_CURRENCY','CBP','Currency and Monetary Instruments','https://www.help.cbp.gov/s/article/Article-1393?language=en_US',now()),
('CBP_TOBACCO','CBP','Tobacco Products for Personal Use','https://www.help.cbp.gov/s/article/Article-1376?language=en_US',now()),
('TSA_ALL','TSA','What Can I Bring?','https://www.tsa.gov/travel/security-screening/whatcanibring/all-list',now()),
('TSA_ALCOHOL','TSA','Alcoholic Beverages','https://www.tsa.gov/travel/security-screening/whatcanibring/items/alcoholic-beverages',now()),
('TSA_TIPS','TSA','TSA Travel Tips / 3-1-1','https://www.tsa.gov/news/press/factsheets/tsa-travel-tips',now()),
('FAA_PACKSAFE','FAA','PackSafe for Passengers','https://www.faa.gov/hazmat/packsafe',now()),
('FAA_ALCOHOL','FAA','PackSafe - Alcoholic Beverages','https://www.faa.gov/hazmat/packsafe/alcoholic-beverages',now()),
('FAA_BATTERIES','FAA','PackSafe - Batteries','https://www.faa.gov/hazmat/packsafe/batteries',now()),
('FAA_TOILETRIES','FAA','PackSafe - Medicinal & Toiletry Articles','https://www.faa.gov/hazmat/packsafe/medicinal-toiletry-articles',now()),
('FAA_DRY_ICE','FAA','PackSafe - Dry Ice','https://www.faa.gov/hazmat/packsafe/dry-ice',now()),
('FAA_LIGHTERS','FAA','PackSafe - Lighters','https://www.faa.gov/hazmat/packsafe/lighters',now()),
('FAA_VAPE','FAA','PackSafe - Electronic Cigarettes, Vaping Devices','https://www.faa.gov/hazmat/packsafe/e-cigarettes-vaping',now()),
('FAA_OXYGEN','FAA','PackSafe - Oxygen','https://www.faa.gov/hazmat/packsafe/oxygen-compressed-or-liquid',now()),
('FDA_PERSONAL','FDA','Personal Importation','https://www.fda.gov/importeddrugs',now()),
('FDA_MEDS','FDA','Traveling with Prescription Medications','https://www.fda.gov/drugs/fda-drug-info-rounds-video/traveling-prescription-medications',now()),
('FWS_IMPORT','USFWS','Information for Importers & Exporters','https://www.fws.gov/program/office-of-law-enforcement/information-importers-exporters',now())
on conflict(source_key) do update set
  agency=excluded.agency,
  title=excluded.title,
  url=excluded.url,
  last_verified_at=excluded.last_verified_at,
  active=true,
  updated_at=now();

create or replace view public.regulatory_source_registry_v3_active as
select source_key,agency,title,url,last_verified_at
from public.regulatory_source_registry_v3
where active=true;

revoke all on public.regulatory_source_registry_v3_active from anon;
grant select on public.regulatory_source_registry_v3_active to authenticated;
