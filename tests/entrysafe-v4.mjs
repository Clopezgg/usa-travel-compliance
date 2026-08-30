import fs from 'node:fs';
import assert from 'node:assert/strict';
import {CATALOG,CATALOG_VERSION,ALIAS_COUNT,searchCatalogV4,catalogStats} from '../web/catalog-v4.js';
import {toGrams,toMl,presentationTotalMl,formatBestVolume,microQuestions,resolveProfile,selectionFingerprint,stableKey,operationalSummary} from '../web/entrysafe-core-v4.js';

const html=fs.readFileSync(new URL('../web/index.html',import.meta.url),'utf8');
const css=fs.readFileSync(new URL('../web/entrysafe-v4.css',import.meta.url),'utf8');
const app=fs.readFileSync(new URL('../web/entrysafe-v4.js',import.meta.url),'utf8');
const core=fs.readFileSync(new URL('../web/entrysafe-core-v4.js',import.meta.url),'utf8');
const catalog=fs.readFileSync(new URL('../web/catalog-v4.js',import.meta.url),'utf8');
const engine=fs.readFileSync(new URL('../supabase/functions/evaluate-trip-selection-v4/index.ts',import.meta.url),'utf8');
const migration=fs.readFileSync(new URL('../supabase/migrations/20260830223000_entrysafe_v4_traveler_experience.sql',import.meta.url),'utf8');
const sw=fs.readFileSync(new URL('../web/sw.js',import.meta.url),'utf8');

assert.equal(CATALOG_VERSION,'2026.08.30-v4');
assert.ok(CATALOG.length>=900,`Expected >=900 selectable products, got ${CATALOG.length}`);
assert.ok(ALIAS_COUNT>=3000,`Expected >=3000 searchable aliases, got ${ALIAS_COUNT}`);
const stats=catalogStats();assert.equal(stats.products,CATALOG.length);assert.equal(stats.aliases,ALIAS_COUNT);

const find=q=>searchCatalogV4(q,'all','all')[0]?.name_es||'';
assert.match(find('churrus'),/Churros/i);
assert.match(find('pollo frito'),/Pollo completamente cocido/i);
assert.match(find('gallina asada'),/Gallina completamente cocido/i);
assert.match(find('quesillo'),/Quesillo/i);
assert.match(find('cuajada'),/Cuajada/i);
assert.match(find('requeson'),/Requesón/i);
assert.match(find('baleada'),/Baleadas/i);
assert.match(find('arroz chino'),/Arroz chino/i);
assert.match(find('chapsuy'),/Chop suey/i);
assert.match(find('gifiti'),/Gifiti/i);
assert.match(find('tableta de coco'),/Tabletas de coco/i);

assert.ok(Math.abs(toGrams(2,'lb')+toGrams(16,'oz')-1360.77711)<0.001,'lb/oz conversion failed');
assert.equal(toGrams(1,'kg'),1000);assert.equal(toGrams(1000,'mg'),1);
assert.equal(toMl(1,'L'),1000);assert.ok(Math.abs(toMl(4,'fl_oz')-118.29411825)<0.001);
const alcoholTotal=presentationTotalMl([{count:1,size:2,unit:'L'},{count:4,size:4,unit:'fl_oz'}]);
assert.ok(Math.abs(alcoholTotal-2473.176473)<0.001,`Alcohol total incorrect: ${alcoholTotal}`);
assert.equal(formatBestVolume(alcoholTotal),'2.473 L');

const baleada=CATALOG.find(x=>x.name_es==='Baleadas');assert.ok(baleada);
assert.equal(resolveProfile(baleada,{}),'prepared_mixed');
assert.equal(resolveProfile(baleada,{ingredients:['poultry'],fullyCooked:'yes'}),'poultry_cooked');
assert.equal(resolveProfile(baleada,{ingredients:['pork'],fullyCooked:'yes'}),'pork_processed');
assert.ok(microQuestions(baleada,{}).some(q=>q.id==='ingredients'));

const d1={item:baleada,catalogKey:stableKey(baleada),quantityValue:1,quantityUnit:'unit',presentations:[],answers:{},measurementKind:'count'};
const d2=structuredClone(d1);d2.quantityValue=2;
assert.notEqual(selectionFingerprint([d1]),selectionFingerprint([d2]),'dirty-state fingerprint must change with quantity');
const sum=operationalSummary([{computed_decision:'allowed_declare',evaluation_v3:{declare:true}},{computed_decision:'allowed'},{computed_decision:'review'}]);
assert.equal(sum.ready,2,'Declare must count as prepared/ready');assert.equal(sum.declare,1);assert.equal(sum.pending,1);

for(const id of ['authView','appView','tripView','carryView','packView','documentsView','profileView','adminView','carrySearch','carryList','pendingQuestions','saveBar','saveCarryBtn','tripDialog','tripPicker','bagDialog','documentDialog','saveResultDialog','declarationDialog'])assert.ok(html.includes(`id="${id}"`),`Missing DOM id ${id}`);
for(const label of ['Viaje','Lo que llevo','Empacar','Documentos','Perfil','¿Qué llevarás a Estados Unidos?','Lo que debes declarar'])assert.ok(html.includes(label)||app.includes(label),`Missing traveler copy ${label}`);
assert.ok(!html.includes('entrysafe-v3.css')&&!html.includes('entrysafe-v3.js')&&!html.includes('runtime.js')&&!html.includes('verification-gate.js'),'Legacy UI runtime still loaded');
assert.ok(html.includes('entrysafe-v4.css')&&html.includes('entrysafe-v4.js'),'V4 assets not loaded');
for(const token of ['.trip-hero','.journey-step','.carry-row','.pending-questions','.packing-panel','.declaration-columns','.mobile-tabs','@media(max-width:820px)'])assert.ok(css.includes(token),`Missing V4 design token ${token}`);
for(const token of ['evaluate-trip-selection-v4','selectionFingerprint','renderSaveBar','togglePacked','assignBag','showDeclaration','ensureDefaultBags','Regulatory Control Center'])assert.ok(app.includes(token),`Missing app capability ${token}`);
for(const token of ['answers_v4','item_weight_grams_v4','packed_at_v4','declaration_name_en_v4','max_weight_kg','trip_declaration_snapshots_v4','enable row level security'])assert.ok(migration.toLowerCase().includes(token.toLowerCase()),`Missing migration capability ${token}`);
for(const token of ['VERSION="4.0.0-20260830"','evaluate-trip-selection-v3','pendingQuestions','trip_declaration_snapshots_v4','allowed_declare','rawItems.length>1000'])assert.ok(engine.includes(token),`Missing V4 engine capability ${token}`);
assert.ok(sw.includes('entrysafe-v4-definitive')&&sw.includes('entrysafe-v4.js')&&sw.includes('entrysafe-core-v4.js'),'Service worker is not V4');
assert.ok(!/raw\.githubusercontent|cdn\.jsdelivr|esm\.sh/.test(html+app+core+catalog),'Frontend runtime must remain same-origin');
const forbiddenEmoji=/[☕🥩🥭🌿🧀🍗🐟🥖✈👑⚠✅❌]/u;for(const [name,text] of [['index',html],['app',app],['css',css]])assert.ok(!forbiddenEmoji.test(text),`Visible emoji forbidden in ${name}`);

const parseable=app.replace(/^import[^\n]+\n/gm,'');new Function(parseable);
new Function(core.replace(/^export\s+/gm,''));
console.log(`EntrySafe V4 certified: ${CATALOG.length} products, ${ALIAS_COUNT} aliases, traveler-first flow OK`);
