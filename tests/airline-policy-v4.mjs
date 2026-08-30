import fs from 'node:fs';
import assert from 'node:assert/strict';
const migration=fs.readFileSync(new URL('../supabase/migrations/20260830224500_entrysafe_v4_airline_policy_snapshots.sql',import.meta.url),'utf8');
for(const token of ['airline_policy_snapshots_v4','JetBlue','American Airlines','Avianca','22.68','23','10','dimensions_cm','apply_airline_bag_policy_v4','trg_apply_airline_bag_policy_v4','enable row level security','private.is_admin()'])assert.ok(migration.includes(token),`Missing airline-policy capability ${token}`);
for(const url of ['https://www.jetblue.com/help/carry-on-bags','https://www.jetblue.com/bag-calculator','https://www.aa.com/web/i18n/travel-info/baggage/carry-on-baggage.html','https://www.aa.com/web/i18n/travel-info/baggage/checked-baggage-policy.html','https://ayuda.avianca.com/hc/en-us/articles/13080259544219-What-is-carry-on-baggage-and-how-can-I-purchase-it','https://ayuda.avianca.com/hc/en-us/articles/13081204585883-What-is-the-maximum-weight-and-size-for-checked-baggage'])assert.ok(migration.includes(url),`Missing official airline source ${url}`);
assert.ok(migration.includes('commercial carrier policies')&&migration.includes('must never be presented as TSA/FAA law'),'Airline/federal separation guard missing');
console.log('EntrySafe V4 official-airline policy snapshots certified and separated from TSA/FAA rules');
