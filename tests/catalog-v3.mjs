import { CATALOG,SECTIONS,CATALOG_VERSION,searchCatalog } from '../web/catalog-v3.js';
import fs from 'node:fs';
const engine=fs.readFileSync(new URL('../supabase/functions/evaluate-trip-selection-v3/index.ts',import.meta.url),'utf8');
if(CATALOG_VERSION!=='2026.08.30-v3')throw new Error(`Unexpected catalog version ${CATALOG_VERSION}`);
if(CATALOG.length<900)throw new Error(`Catalog is too small: ${CATALOG.length}; expected at least 900 visible checklist options`);
if(SECTIONS.length<20)throw new Error(`Not enough checklist sections: ${SECTIONS.length}`);
const names=new Set(CATALOG.map(x=>x.name_es));
for(const required of ['Pollo completamente cocido','Gallina completamente cocido','Gallo completamente cocido','Churros / churritos','Galletas dulces','Quesillo','Tabletas de coco','Aguardiente / guaro 40%','Ron 40%','Power bank hasta 100 Wh','Perfume','Medicamento recetado','Aguacate fresco','Mango fresco','Café tostado o molido'])if(!names.has(required))throw new Error(`Missing required everyday item: ${required}`);
const profiles=[...new Set(CATALOG.map(x=>x.profile))];
for(const p of profiles)if(!engine.includes(`${p}:{`))throw new Error(`Catalog profile has no engine rule: ${p}`);
for(const item of CATALOG){if(!item.name_es||!item.section||!item.profile||!item.measurement_kind||!item.default_unit)throw new Error(`Incomplete catalog row: ${JSON.stringify(item)}`);}
const common=searchCatalog('', 'Honduras y frecuentes');if(common.length<20)throw new Error('Honduras frequent section is too small');
if(!searchCatalog('churrus').some(x=>x.name_es==='Churros / churritos'))throw new Error('Honduran alias churrus does not resolve');
if(!searchCatalog('pollo frito').some(x=>x.name_es==='Pollo completamente cocido'))throw new Error('Pollo frito alias does not resolve to cooked poultry');
if(!searchCatalog('cafe hondureno').some(x=>x.name_es==='Café tostado o molido'))throw new Error('Coffee alias does not resolve');
const allowedKinds=new Set(['count','mass','volume','days','money']);for(const item of CATALOG)if(!allowedKinds.has(item.measurement_kind))throw new Error(`Unsupported measurement kind ${item.measurement_kind}`);
console.log(`EntrySafe catalog certified: ${CATALOG.length} visible options across ${SECTIONS.length} sections and ${profiles.length} regulatory profiles`);
