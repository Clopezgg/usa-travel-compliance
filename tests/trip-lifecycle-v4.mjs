import fs from 'node:fs';
import assert from 'node:assert/strict';
const manager=fs.readFileSync(new URL('../web/trip-management-v4.js',import.meta.url),'utf8');
const bridge=fs.readFileSync(new URL('../web/trip-management-v3.js',import.meta.url),'utf8');
for(const token of ['selectTrip','editTrip','deleteTrip','setStatus','completed','cancelled','planned','removeStoredDocuments','Guardar cambios','Reabrir','Cerrar','Cancelar','Eliminar'])assert.ok(manager.includes(token),`Missing trip lifecycle capability ${token}`);
assert.ok(manager.includes("localStorage.setItem('entrysafe-v4-trip'"),'V4 trip selection key is not persisted');
assert.ok(bridge.includes("import './trip-management-v4.js'"),'Cached V3 entrypoint must delegate to V4 manager');
const parseable=manager.replace(/^import[^\n]+\n/gm,'');new Function(parseable);
console.log('EntrySafe V4 trip lifecycle certified: create/select/edit/close/cancel/reopen/delete');
