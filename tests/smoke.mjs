import fs from 'node:fs';
const html=fs.readFileSync(new URL('../web/index.html',import.meta.url),'utf8');
const css=fs.readFileSync(new URL('../web/entrysafe-v2.css',import.meta.url),'utf8');
const app=fs.readFileSync(new URL('../web/entrysafe-v2.js',import.meta.url),'utf8');
const client=fs.readFileSync(new URL('../web/supabase-local.js',import.meta.url),'utf8');
const verifier=fs.readFileSync(new URL('../supabase/functions/verify-travel-product/index.ts',import.meta.url),'utf8');
const migration=fs.readFileSync(new URL('../supabase/migrations/20260830200500_entrysafe_v2_packing.sql',import.meta.url),'utf8');
const sw=fs.readFileSync(new URL('../web/sw.js',import.meta.url),'utf8');

for(const id of ['authView','appView','dashboardView','tripsView','packingView','documentsView','catalogView','adminView','profileView','tripDialog','itemDialog','bagDialog','documentDialog','globalAdd']){
  if(!html.includes(`id="${id}"`))throw new Error(`Missing EntrySafe 2.0 DOM id: ${id}`);
}
for(const token of ['Tu viaje.','Todo bajo control.','Mi equipaje','Lo que llevaré','Consultar reglas','Administración'])if(!html.includes(token)&&!app.includes(token))throw new Error(`Missing product token: ${token}`);
for(const token of ['--canvas:#f4f6f8','--surface:#fff','.boarding-card','.packing-list','.catalog-grid','.mobile-nav','@media(max-width:820px)'])if(!css.includes(token))throw new Error(`Missing premium design token: ${token}`);
for(const token of ['packed','item_group','regulatory_required','packing_notes'])if(!migration.includes(token))throw new Error(`Missing packing migration field: ${token}`);
for(const token of ['verify-travel-product','itemNeedsVerification','verifyItem','verificationId','canSave','togglePacked','toggleDeclared','Cierre del viaje','product_verifications'])if(!app.includes(token)&&!verifier.includes(token))throw new Error(`Missing functional token: ${token}`);
for(const token of ['SESSION_KEY','signInWithPassword','resetPasswordForEmail','PostgrestBuilder','storage','functions'])if(!client.includes(token))throw new Error(`Missing local Supabase client token: ${token}`);
if(html.includes('runtime.js')||html.includes('verification-gate.js')||html.includes('styles.css'))throw new Error('Legacy frontend assets are still loaded by index.html');
if(!html.includes('entrysafe-v2.css')||!html.includes('entrysafe-v2.js'))throw new Error('EntrySafe 2.0 assets are not loaded');

const forbiddenEmoji=/[☕🥩🥭🌿🧀🍗🐟🥖✈👑⚠✅❌]/u;
for(const [name,text] of [['index.html',html],['entrysafe-v2.js',app],['entrysafe-v2.css',css]])if(forbiddenEmoji.test(text))throw new Error(`Visible emoji forbidden in ${name}; use SVG symbols instead`);
if(!html.includes('<symbol id="i-coffee"')||!html.includes('<symbol id="i-food"')||!html.includes('<symbol id="i-leaf"'))throw new Error('Professional SVG category icon system is incomplete');

const parseable=app.replace(/^import[^\n]+\n/gm,'');
try{new Function(parseable);}catch(error){throw new Error(`EntrySafe 2.0 browser syntax invalid: ${error.message}`);}
if(!sw.includes('entrysafe-v2'))throw new Error('Service worker cache was not upgraded for EntrySafe 2.0');
console.log('EntrySafe 2.0 premium packing, verification, SVG-only UI and responsive smoke checks passed');
