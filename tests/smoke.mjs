import { readFileSync, existsSync } from 'node:fs';
const required=['web/index.html','web/app.js','web/styles.css','web/manifest.webmanifest','web/sw.js','render.yaml','supabase/schema.sql','supabase/seed.sql'];
for(const f of required){if(!existsSync(f))throw new Error(`Missing ${f}`)}
const html=readFileSync('web/index.html','utf8');
const js=readFileSync('web/app.js','utf8');
for(const token of ['authForm','tripForm','itemForm','documentForm','declarationDialog'])if(!html.includes(token))throw new Error(`HTML workflow missing ${token}`);
for(const token of ["from('trips')","from('trip_items')","from('catalog_items')","from('regulatory_rules')","storage.from('travel-documents')"])if(!js.includes(token))throw new Error(`Data workflow missing ${token}`);
console.log('Smoke checks passed');
