import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.112.4/+esm';
import { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY } from './config.js';

const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
const $ = id => document.getElementById(id);
const state = { session:null, user:null, trips:[], catalog:[], dashboardItems:[], selectedTrip:null, bags:[], items:[], documents:[], rulesByItem:new Map() };
const decisionRank = { prohibited:5, restricted:4, review:3, allowed_declare:2, allowed:1 };
const riskRank = { high:4, review:3, medium:2, low:1 };

function showStatus(message,type='info'){
  const el=$('statusBanner'); el.textContent=message; el.className=`status ${type}`; el.classList.remove('hidden');
  clearTimeout(showStatus.timer); showStatus.timer=setTimeout(()=>el.classList.add('hidden'),6500);
}
function esc(value=''){return String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));}
function fmtDate(v){if(!v)return '—'; const [y,m,d]=v.split('-'); return `${d}/${m}/${y}`;}
function daysBetween(a,b){if(!a||!b)return 0; const aa=Date.parse(`${a}T00:00:00Z`), bb=Date.parse(`${b}T00:00:00Z`); return Math.max(0,Math.round((bb-aa)/86400000));}
function decisionLabel(v){return ({allowed:'Permitido',allowed_declare:'Permitido · declarar',restricted:'Restringido',prohibited:'No llevar / prohibido',review:'Revisar'})[v]||'Revisar';}
function riskLabel(v){return ({low:'Bajo',medium:'Medio',high:'Alto',review:'Revisar'})[v]||'Revisar';}
function currentCatalogByText(text){const q=text.trim().toLowerCase(); return state.catalog.find(i=>i.canonical_name_es.toLowerCase()===q||i.canonical_name_en.toLowerCase()===q||(i.aliases||[]).some(a=>a.toLowerCase()===q));}
function switchTab(name){document.querySelectorAll('.tab').forEach(b=>b.classList.toggle('active',b.dataset.tab===name)); document.querySelectorAll('.tab-panel').forEach(p=>p.classList.add('hidden')); $(`${name}Tab`).classList.remove('hidden'); if(name==='catalog')renderCatalog();}

async function ensureProfile(){
  const {data}=await supabase.from('profiles').select('user_id').eq('user_id',state.user.id).maybeSingle();
  if(!data){await supabase.from('profiles').insert({user_id:state.user.id,display_name:state.user.email?.split('@')[0]||null});}
}
async function initAuthenticated(session){
  state.session=session; state.user=session.user; $('authView').classList.add('hidden'); $('appView').classList.remove('hidden'); $('signOutBtn').classList.remove('hidden');
  await ensureProfile(); await Promise.all([loadCatalog(),loadTrips(),loadDashboardItems()]); renderDashboard(); renderTrips();
}
function initSignedOut(){state.session=null; state.user=null; $('authView').classList.remove('hidden'); $('appView').classList.add('hidden'); $('signOutBtn').classList.add('hidden');}

async function loadCatalog(){
  const {data,error}=await supabase.from('catalog_items').select('*').eq('active',true).order('canonical_name_es'); if(error)throw error; state.catalog=data||[];
  $('catalogDatalist').innerHTML=state.catalog.map(i=>`<option value="${esc(i.canonical_name_es)}">${esc(i.category)} · ${esc(i.subcategory||'')}</option>`).join('');
}
async function loadTrips(){
  const {data,error}=await supabase.from('trips').select('*').order('departure_date',{ascending:false}); if(error)throw error; state.trips=data||[];
  if(state.selectedTrip){state.selectedTrip=state.trips.find(t=>t.id===state.selectedTrip.id)||null;}
}
async function loadDashboardItems(){
  const {data,error}=await supabase.from('trip_items').select('id,computed_decision'); if(error)throw error; state.dashboardItems=data||[];
}
async function selectTrip(id){
  state.selectedTrip=state.trips.find(t=>t.id===id)||null; if(!state.selectedTrip)return;
  const [bagsRes,itemsRes,docsRes]=await Promise.all([
    supabase.from('trip_bags').select('*').eq('trip_id',id).order('created_at'),
    supabase.from('trip_items').select('*, catalog_items(canonical_name_es,canonical_name_en,category,subcategory), regulatory_rules(id,explanation,traveler_action,declaration_required,regulatory_sources(title,url,agency))').eq('trip_id',id).order('created_at'),
    supabase.from('trip_documents').select('*').eq('trip_id',id).order('created_at',{ascending:false})
  ]);
  if(bagsRes.error)throw bagsRes.error; if(itemsRes.error)throw itemsRes.error; if(docsRes.error)throw docsRes.error;
  state.bags=bagsRes.data||[]; state.items=itemsRes.data||[]; state.documents=docsRes.data||[];
  await loadDashboardItems(); renderTripWorkspace(); switchTab('trip');
}
function renderDashboard(){
  $('metricTrips').textContent=state.trips.length;
  $('metricDays').textContent=state.trips.reduce((n,t)=>n+daysBetween(t.departure_date,t.return_date),0);
  $('metricItems').textContent=state.dashboardItems.length;
  $('metricAlerts').textContent=state.dashboardItems.filter(i=>['prohibited','restricted','review'].includes(i.computed_decision)).length;
  const today=new Date().toISOString().slice(0,10); const next=[...state.trips].filter(t=>t.departure_date>=today&&t.status!=='cancelled').sort((a,b)=>a.departure_date.localeCompare(b.departure_date))[0];
  $('nextTripCard').innerHTML=next?`<div class="trip-main"><b>Honduras → ${esc(next.entry_airport||'Estados Unidos')}</b><small>${fmtDate(next.departure_date)} · ${esc(next.airline||'Aerolínea pendiente')} ${esc(next.flight_number||'')}</small></div><button class="secondary small" data-open-trip="${next.id}">Abrir</button>`:'Todavía no hay viajes.';
  document.querySelectorAll('[data-open-trip]').forEach(b=>b.addEventListener('click',()=>selectTrip(b.dataset.openTrip).catch(handleError)));
}
function renderTrips(){
  const list=$('tripList'); if(!state.trips.length){list.innerHTML='<div class="empty">No hay viajes guardados.</div>';return;}
  list.innerHTML=state.trips.map(t=>`<article class="trip-card"><div class="trip-main"><b>${fmtDate(t.departure_date)} · HN → ${esc(t.entry_airport||'US')}</b><small>${esc(t.airline||'Aerolínea pendiente')} ${esc(t.flight_number||'')} · ${esc(t.status)}</small></div><button class="secondary small" data-trip-id="${t.id}">Abrir</button></article>`).join('');
  list.querySelectorAll('[data-trip-id]').forEach(b=>b.addEventListener('click',()=>selectTrip(b.dataset.tripId).catch(handleError)));
}
function computeScores(){
  const t=state.selectedTrip; if(!t)return null;
  const docsChecks=[!!t.departure_date,!!t.return_date,!!t.airline,!!t.entry_airport,!!t.purpose];
  const documentScore=Math.round(docsChecks.filter(Boolean).length/docsChecks.length*100);
  let stayScore=100; const blockers=[];
  if(t.admit_until&&t.return_date&&t.return_date>t.admit_until){stayScore=20;blockers.push({level:'high',text:'El regreso previsto está después de la fecha Admit Until registrada.'});}
  const penalties={prohibited:42,restricted:20,review:12,allowed_declare:0,allowed:0};
  let cbpPenalty=0,usdaPenalty=0;
  for(const i of state.items){let p=penalties[i.computed_decision]||0; if(i.computed_decision==='allowed_declare'&&!i.declared)p+=8; cbpPenalty+=p; usdaPenalty+=p; if(i.computed_decision==='prohibited')blockers.push({level:'high',text:`${i.catalog_items?.canonical_name_es||i.custom_name}: ${decisionLabel(i.computed_decision)}`}); else if(['restricted','review'].includes(i.computed_decision))blockers.push({level:'medium',text:`${i.catalog_items?.canonical_name_es||i.custom_name}: ${decisionLabel(i.computed_decision)}`});}
  const cbpScore=Math.max(0,100-cbpPenalty), usdaScore=Math.max(0,100-usdaPenalty), tsaScore=0;
  const readiness=Math.round((documentScore+stayScore+cbpScore+usdaScore)/4);
  return {documentScore,stayScore,cbpScore,usdaScore,tsaScore,readiness,blockers};
}
function renderTripWorkspace(){
  const t=state.selectedTrip; $('noTripSelected').classList.toggle('hidden',!!t); $('tripWorkspace').classList.toggle('hidden',!t); if(!t)return;
  $('tripTitle').textContent=`Viaje · ${fmtDate(t.departure_date)} · HN → ${t.entry_airport||'US'}`;
  $('tripMeta').textContent=`${t.airline||'Aerolínea pendiente'} ${t.flight_number||''} · regreso ${fmtDate(t.return_date)} · ${t.status}`;
  const s=computeScores(); $('readinessScore').textContent=`${s.readiness}/100`;
  $('scoreBreakdown').innerHTML=`<div><b>Documentación</b><span>${s.documentScore}/100</span></div><div><b>Estancia registrada</b><span>${s.stayScore}/100</span></div><div><b>CBP / declaración</b><span>${s.cbpScore}/100</span></div><div><b>USDA</b><span>${s.usdaScore}/100</span></div>`;
  $('tripWarnings').innerHTML=s.blockers.length?s.blockers.map(w=>`<div class="warning ${w.level}">${esc(w.text)}</div>`).join(''):'<div class="warning">Sin bloqueos detectados en la cobertura cargada.</div>';
  renderBags(); renderItems(); renderDocuments(); renderDashboard();
}
function renderBags(){
  $('bagList').innerHTML=state.bags.length?state.bags.map(b=>`<span class="chip">${esc(b.label)} · ${esc(b.bag_type)}</span>`).join(''):'<span class="muted">Sin maletas.</span>';
  $('itemBag').innerHTML='<option value="">Sin asignar</option>'+state.bags.map(b=>`<option value="${b.id}">${esc(b.label)}</option>`).join('');
}
function renderItems(){
  const list=$('itemList'); if(!state.items.length){list.innerHTML='<div class="empty">Agrega lo que llevarás y el sistema evaluará las reglas cargadas.</div>';return;}
  list.innerHTML=state.items.map(i=>{const name=i.catalog_items?.canonical_name_es||i.custom_name||'Artículo'; const rule=i.regulatory_rules; const source=rule?.regulatory_sources; return `<article class="item-row"><div><div class="item-title">${esc(name)}</div><span class="badge ${esc(i.computed_risk)}">${esc(decisionLabel(i.computed_decision))} · riesgo ${esc(riskLabel(i.computed_risk))}</span><div class="fine">${esc(rule?.explanation||'Sin regla específica; requiere revisión manual.')}</div>${source?`<a class="source-link" href="${esc(source.url)}" target="_blank" rel="noopener">${esc(source.agency)} · ${esc(source.title)}</a>`:''}</div><div class="item-actions"><button class="${i.declared?'secondary':'ghost'}" data-declare="${i.id}" type="button">${i.declared?'Declarado':'Marcar declarado'}</button><button class="danger" data-delete-item="${i.id}" type="button">×</button></div></article>`}).join('');
  list.querySelectorAll('[data-declare]').forEach(b=>b.addEventListener('click',()=>toggleDeclared(b.dataset.declare).catch(handleError)));
  list.querySelectorAll('[data-delete-item]').forEach(b=>b.addEventListener('click',()=>deleteItem(b.dataset.deleteItem).catch(handleError)));
}
function renderDocuments(){
  $('documentList').innerHTML=state.documents.length?state.documents.map(d=>`<article class="doc-card"><div><b>${esc(d.document_type)}</b><small>${esc(d.masked_identifier||'')} ${d.expires_on?'· vence '+fmtDate(d.expires_on):''}</small></div>${d.storage_path?'<span class="ok">Archivo privado</span>':'<span class="muted">Solo metadatos</span>'}</article>`).join(''):'<div class="empty">Sin documentos.</div>';
}
function renderCatalog(){
  const q=$('catalogSearch').value.trim().toLowerCase(); const rows=state.catalog.filter(i=>!q||[i.canonical_name_es,i.canonical_name_en,i.category,i.subcategory,...(i.aliases||[])].filter(Boolean).some(v=>String(v).toLowerCase().includes(q))).slice(0,100);
  $('catalogList').innerHTML=rows.map(i=>`<div class="catalog-row"><b>${esc(i.canonical_name_es)}</b><small>${esc(i.canonical_name_en)} · ${esc(i.category)} / ${esc(i.subcategory||'general')} · riesgo base ${esc(riskLabel(i.default_risk))}</small></div>`).join('')||'<div class="empty">Sin coincidencias.</div>';
}
function ruleMatches(rule,attrs){
  const c=rule?.condition_json||{};
  if(c.must_be_thoroughly_cooked===true&&attrs.cooked_state!=='fully_cooked')return false;
  if(c.sealed===true&&!attrs.hermetically_sealed)return false;
  if(c.commercial===true&&!attrs.commercial_packaging)return false;
  if(c.shelf_stable===true&&!attrs.shelf_stable)return false;
  return true;
}
async function resolveRule(catalogItemId,attrs){
  if(!catalogItemId)return null; const {data,error}=await supabase.from('regulatory_rules').select('*, regulatory_sources(*)').eq('catalog_item_id',catalogItemId).eq('origin_country','HN').eq('destination_region','US_CONTINENTAL'); if(error)throw error;
  return (data||[]).filter(r=>ruleMatches(r,attrs)).sort((a,b)=>(decisionRank[b.decision]-decisionRank[a.decision])||(riskRank[b.risk_level]-riskRank[a.risk_level]))[0]||null;
}
async function toggleDeclared(id){const item=state.items.find(i=>i.id===id); if(!item)return; const {error}=await supabase.from('trip_items').update({declared:!item.declared}).eq('id',id); if(error)throw error; await selectTrip(state.selectedTrip.id);}
async function deleteItem(id){if(!confirm('¿Eliminar este artículo del viaje?'))return; const {error}=await supabase.from('trip_items').delete().eq('id',id); if(error)throw error; await selectTrip(state.selectedTrip.id);}
async function handleAuthSubmit(e){e.preventDefault(); const email=$('emailInput').value.trim(), password=$('passwordInput').value; const {data,error}=await supabase.auth.signInWithPassword({email,password}); if(error)throw error; if(data.session)await initAuthenticated(data.session);}
async function handleSignup(){const email=$('emailInput').value.trim(), password=$('passwordInput').value; if(!email||password.length<8){showStatus('Usa un correo válido y una contraseña de al menos 8 caracteres.','error');return;} const {data,error}=await supabase.auth.signUp({email,password}); if(error)throw error; if(data.session)await initAuthenticated(data.session); else showStatus('Cuenta creada. Revisa tu correo para confirmar el acceso.','success');}
async function handleTripCreate(e){e.preventDefault(); const dep=$('departureDate').value, ret=$('returnDate').value||null; if(ret&&ret<dep){showStatus('La fecha de regreso no puede ser anterior a la salida.','error');return;} const payload={user_id:state.user.id,origin_country:'HN',destination_country:'US',departure_date:dep,return_date:ret,airline:$('airline').value.trim()||null,flight_number:$('flightNumber').value.trim()||null,entry_airport:$('entryAirport').value.trim().toUpperCase()||null,purpose:$('purpose').value,notes:$('tripNotes').value.trim()||null}; const {data,error}=await supabase.from('trips').insert(payload).select().single(); if(error)throw error; e.target.reset(); $('tripForm').classList.add('hidden'); await loadTrips(); renderTrips(); renderDashboard(); await selectTrip(data.id); showStatus('Viaje guardado.','success');}
async function handleBagCreate(e){e.preventDefault(); if(!state.selectedTrip)return; const label=$('bagLabel').value.trim(); if(!label)return; const {error}=await supabase.from('trip_bags').insert({trip_id:state.selectedTrip.id,user_id:state.user.id,bag_type:$('bagType').value,label}); if(error)throw error; e.target.reset(); await selectTrip(state.selectedTrip.id);}
async function handleItemCreate(e){e.preventDefault(); if(!state.selectedTrip)return; const text=$('itemSearch').value.trim(); const item=currentCatalogByText(text); const attrs={cooked_state:$('cookedState').value,commercial_packaging:$('commercialPackaging').checked,hermetically_sealed:$('sealed').checked,shelf_stable:$('shelfStable').checked}; const rule=item?await resolveRule(item.id,attrs):null; const payload={trip_id:state.selectedTrip.id,bag_id:$('itemBag').value||null,user_id:state.user.id,catalog_item_id:item?.id||null,custom_name:item?null:text,quantity:Number($('itemQuantity').value)||1,unit:'unit',homemade:$('homemade').checked,cooked_state:attrs.cooked_state,commercial_packaging:attrs.commercial_packaging,hermetically_sealed:attrs.hermetically_sealed,shelf_stable:attrs.shelf_stable,contains_meat:$('containsMeat').checked,declared:false,computed_decision:rule?.decision||'review',computed_risk:rule?.risk_level||'review',matched_rule_id:rule?.id||null,rule_version:rule?.rule_version||null}; const {error}=await supabase.from('trip_items').insert(payload); if(error)throw error; e.target.reset(); $('itemQuantity').value='1'; await selectTrip(state.selectedTrip.id); showStatus(rule?`${decisionLabel(rule.decision)} · ${rule.traveler_action}`:'Artículo sin regla específica: marcado para revisión.','success');}
async function handleDocumentCreate(e){e.preventDefault(); if(!state.selectedTrip)return; let path=null; const file=$('documentFile').files?.[0]; if(file){const safe=file.name.replace(/[^a-zA-Z0-9._-]/g,'_'); path=`${state.user.id}/${state.selectedTrip.id}/${crypto.randomUUID()}-${safe}`; const up=await supabase.storage.from('travel-documents').upload(path,file,{upsert:false}); if(up.error)throw up.error;} const {error}=await supabase.from('trip_documents').insert({trip_id:state.selectedTrip.id,user_id:state.user.id,document_type:$('documentType').value,storage_path:path,masked_identifier:$('maskedIdentifier').value.trim()||null,expires_on:$('documentExpiry').value||null}); if(error)throw error; e.target.reset(); await selectTrip(state.selectedTrip.id); showStatus('Documento guardado de forma privada.','success');}
async function saveSnapshot(){const s=computeScores(); if(!s)return; const {error}=await supabase.from('compliance_snapshots').insert({trip_id:state.selectedTrip.id,user_id:state.user.id,document_score:s.documentScore,stay_score:s.stayScore,cbp_score:s.cbpScore,usda_score:s.usdaScore,tsa_score:0,readiness_score:s.readiness,blockers:[...s.blockers,{type:'coverage',area:'TSA',status:'not_evaluated'}]}); if(error)throw error; showStatus('Balance guardado en el historial del viaje.','success');}
async function completeTrip(){const {error}=await supabase.from('trips').update({status:'completed'}).eq('id',state.selectedTrip.id); if(error)throw error; await loadTrips(); await selectTrip(state.selectedTrip.id);}
async function deleteTrip(){if(!confirm('¿Eliminar este viaje y todos sus registros asociados?'))return; const id=state.selectedTrip.id; const {error}=await supabase.from('trips').delete().eq('id',id); if(error)throw error; state.selectedTrip=null; state.bags=[]; state.items=[]; state.documents=[]; await loadTrips(); renderTrips(); renderDashboard(); renderTripWorkspace(); switchTab('trips');}
function openDeclaration(){const rows=state.items.map(i=>`${i.quantity} × ${i.catalog_items?.canonical_name_en||i.custom_name||'Item'} — ${decisionLabel(i.computed_decision)}${i.declared?' · marked declared':''}`); $('declarationList').innerHTML=rows.length?rows.map(r=>`<li>${esc(r)}</li>`).join(''):'<li>No items recorded.</li>'; $('declarationDialog').showModal();}
function handleError(err){console.error(err); showStatus(err?.message||'Ocurrió un error.','error');}

$('authForm').addEventListener('submit',e=>handleAuthSubmit(e).catch(handleError));
$('signupBtn').addEventListener('click',()=>handleSignup().catch(handleError));
$('signOutBtn').addEventListener('click',async()=>{await supabase.auth.signOut();initSignedOut();});
document.querySelectorAll('.tab').forEach(b=>b.addEventListener('click',()=>switchTab(b.dataset.tab)));
$('toggleTripFormBtn').addEventListener('click',()=>$('tripForm').classList.toggle('hidden'));
$('newTripShortcut').addEventListener('click',()=>{switchTab('trips');$('tripForm').classList.remove('hidden');});
$('cancelTripFormBtn').addEventListener('click',()=>$('tripForm').classList.add('hidden'));
$('tripForm').addEventListener('submit',e=>handleTripCreate(e).catch(handleError));
$('bagForm').addEventListener('submit',e=>handleBagCreate(e).catch(handleError));
$('itemForm').addEventListener('submit',e=>handleItemCreate(e).catch(handleError));
$('documentForm').addEventListener('submit',e=>handleDocumentCreate(e).catch(handleError));
$('saveSnapshotBtn').addEventListener('click',()=>saveSnapshot().catch(handleError));
$('completeTripBtn').addEventListener('click',()=>completeTrip().catch(handleError));
$('deleteTripBtn').addEventListener('click',()=>deleteTrip().catch(handleError));
$('declarationBtn').addEventListener('click',openDeclaration);
$('catalogSearch').addEventListener('input',renderCatalog);
window.addEventListener('online',()=>showStatus('Conexión restaurada.','success'));
window.addEventListener('offline',()=>showStatus('Sin conexión: la interfaz sigue disponible, pero la sincronización requiere internet.','error'));

if('serviceWorker' in navigator)navigator.serviceWorker.register('./sw.js').catch(console.warn);
const {data:{session}}=await supabase.auth.getSession(); if(session)await initAuthenticated(session); else initSignedOut();
supabase.auth.onAuthStateChange((_event,newSession)=>{if(!newSession)initSignedOut();});
