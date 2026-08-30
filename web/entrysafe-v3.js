import { createClient } from './supabase-local.js';
import { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY } from './config.js';
import { CATALOG, CATALOG_VERSION, SECTIONS, UNIT_OPTIONS, searchCatalog } from './catalog-v3.js';

const supabase=createClient(SUPABASE_URL,SUPABASE_PUBLISHABLE_KEY,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
const $=id=>document.getElementById(id);
const state={session:null,user:null,profile:null,trips:[],trip:null,items:[],bags:[],documents:[],batches:[],view:'home',section:'Honduras y frecuentes',query:'',draft:new Map(),lastResult:null,isAdmin:false};
const DECISION_LABEL={allowed:'Listo',allowed_declare:'Declarar',restricted:'Condiciones',conditional:'Condiciones',review:'Revisar',prohibited:'No llevar'};
const BAG_LABEL={either:'Carry-on o facturada',carry_on:'Carry-on',carry_on_preferred:'Preferible carry-on',checked:'Facturada',checked_if_over_100ml:'Facturada si supera 100 ml',conditional:'Revisar ubicación',none:'No empacar'};
const UNIT_LABEL={unit:'unidad',package:'paquete',bottle:'botella',can:'lata',box:'caja',pair:'par',mg:'mg',g:'g',kg:'kg',oz:'oz',lb:'lb',ml:'ml',L:'L',fl_oz:'fl oz',cup:'taza',pint:'pinta',quart:'cuarto',gallon:'galón',day:'días',USD:'USD',Wh:'Wh'};
const SECTION_ICON={
 'Honduras y frecuentes':'star','Carnes y aves':'meat','Lácteos y huevos':'dairy','Pescados y mariscos':'fish','Frutas':'fruit','Verduras y raíces':'leaf','Granos y despensa':'grain','Panes y comidas preparadas':'food','Snacks y dulces':'snack','Condimentos y despensa':'spice','Bebidas':'bottle','Alcohol':'bottle','Plantas y semillas':'leaf','Ropa y accesorios':'shirt','Electrónicos':'laptop','Cuidado personal':'bottle','Medicamentos y salud':'pill','Documentos y dinero':'document','Regalos y recuerdos':'gift','Equipaje y artículos de viaje':'suitcase','Tabaco':'box','Bebés':'baby','Nutrición':'grain','Mascotas':'pet','Otros':'box'};

const esc=(v='')=>String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
const slug=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
const stableKey=item=>`${slug(item.section)}--${slug(item.name_es)}--${slug(item.profile)}`;
const icon=(name='box',cls='')=>`<svg class="icon ${cls}" aria-hidden="true"><use href="#i-${name}"></use></svg>`;
const fmtDate=v=>v?new Date(`${v}T12:00:00`).toLocaleDateString('es-HN',{day:'numeric',month:'short',year:'numeric'}).replace('.',''):'Pendiente';
const fmtShort=v=>v?new Date(`${v}T12:00:00`).toLocaleDateString('es-HN',{day:'numeric',month:'short'}).replace('.',''):'Pendiente';
function toast(message,type=''){const t=$('toast');if(!t)return;t.textContent=message;t.className=`toast ${type}`;clearTimeout(toast.timer);toast.timer=setTimeout(()=>t.classList.add('hidden'),4800);}
function fail(error){console.error(error);toast(error?.message||String(error)||'Ocurrió un error.','error');}
function openDialog(id){const d=$(id);if(d&&!d.open)d.showModal();}
function closeDialog(id){const d=$(id);if(d?.open)d.close();}
function userName(){return state.profile?.display_name||state.user?.email?.split('@')[0]||'Viajero';}
function initials(){return userName().split(/\s+/).filter(Boolean).slice(0,2).map(x=>x[0]).join('').toUpperCase();}
function decisionTone(v){return v==='allowed'?'allowed':v==='allowed_declare'?'allowed_declare':v==='prohibited'?'prohibited':v==='review'?'review':'restricted';}
function daysUntil(v){if(!v)return null;const a=new Date(`${v}T00:00:00`),b=new Date();b.setHours(0,0,0,0);return Math.ceil((a-b)/86400000);}
function ageOn(dateOfBirth,onDate){if(!dateOfBirth||!onDate)return null;const dob=new Date(`${dateOfBirth}T12:00:00`),at=new Date(`${onDate}T12:00:00`);let age=at.getFullYear()-dob.getFullYear();const m=at.getMonth()-dob.getMonth();if(m<0||(m===0&&at.getDate()<dob.getDate()))age--;return age;}

function defaultDraft(item){
 const base={item,quantityValue:1,quantityUnit:item.default_unit||'unit',presentations:[],abvPercent:0,batteryWh:0,batteryMah:0,batteryVoltage:0,daysSupply:0};
 if(item.measurement_kind==='volume'){
   const alcohol=item.section==='Alcohol';
   base.presentations=[{count:1,size:alcohol?750:100,unit:'ml'}];
   if(item.profile==='alcohol_under24')base.abvPercent=item.name_es.toLowerCase().includes('vino')?13:item.name_es.toLowerCase().includes('cerveza')?5:20;
   if(item.profile==='alcohol_24_70')base.abvPercent=40;
   if(item.profile==='alcohol_over70')base.abvPercent=75;
 }
 if(item.measurement_kind==='days'){base.daysSupply=30;base.quantityValue=30;base.quantityUnit='day';}
 if(item.measurement_kind==='money'){base.quantityValue=0;base.quantityUnit='USD';}
 if(item.profile==='power_bank_100')base.batteryWh=100;
 if(item.profile==='power_bank_160')base.batteryWh=120;
 if(item.profile==='battery_over160')base.batteryWh=170;
 return base;
}
function draftFromSaved(row,item){
 const d=defaultDraft(item);
 d.quantityValue=Number(row.quantity_value??row.quantity??d.quantityValue);
 d.quantityUnit=row.quantity_unit||row.unit||d.quantityUnit;
 d.presentations=Array.isArray(row.presentations_v3)?row.presentations_v3:d.presentations;
 d.abvPercent=Number(row.abv_percent||d.abvPercent||0);
 d.batteryWh=Number(row.battery_wh||d.batteryWh||0);
 d.batteryMah=Number(row.battery_mah||0);
 d.batteryVoltage=Number(row.battery_voltage||0);
 d.daysSupply=Number(row.days_supply||d.daysSupply||0);
 return d;
}
function serializeDraft(d){return {catalogKey:stableKey(d.item),name:d.item.name_es,profileKey:d.item.profile,measurementKind:d.item.measurement_kind,quantityValue:Number(d.quantityValue||0),quantityUnit:d.quantityUnit||d.item.default_unit||'unit',presentations:(d.presentations||[]).map(p=>({count:Number(p.count||0),size:Number(p.size||0),unit:p.unit})).filter(p=>p.count>0&&p.size>0),abvPercent:Number(d.abvPercent||0),batteryWh:Number(d.batteryWh||0),batteryMah:Number(d.batteryMah||0),batteryVoltage:Number(d.batteryVoltage||0),daysSupply:Number(d.daysSupply||0)};}

async function ensureProfile(){
 const q=await supabase.from('profiles').select('*').eq('user_id',state.user.id).maybeSingle();if(q.error)throw q.error;
 if(q.data){state.profile=q.data;return;}
 const ins=await supabase.from('profiles').insert({user_id:state.user.id,display_name:state.user.email?.split('@')[0]||'Viajero',home_country:'HN',preferred_language:'es'}).select('*').single();if(ins.error)throw ins.error;state.profile=ins.data;
}
async function detectAdmin(){const q=await supabase.from('admin_users').select('user_id').eq('user_id',state.user.id).maybeSingle();state.isAdmin=!q.error&&!!q.data;}
async function loadTrips(){const q=await supabase.from('trips').select('*').eq('user_id',state.user.id).order('departure_date',{ascending:false});if(q.error)throw q.error;state.trips=q.data||[];const remembered=localStorage.getItem('entrysafe-v3-trip');state.trip=state.trips.find(t=>t.id===remembered)||pickTrip();}
function pickTrip(){const today=new Date().toISOString().slice(0,10);return [...state.trips].filter(t=>t.status!=='cancelled'&&t.departure_date>=today).sort((a,b)=>String(a.departure_date).localeCompare(String(b.departure_date)))[0]||state.trips.find(t=>t.status==='active')||state.trips[0]||null;}
async function loadTripData(){
 state.items=[];state.bags=[];state.documents=[];state.batches=[];state.draft.clear();if(!state.trip)return;
 const [items,bags,docs,batches]=await Promise.all([
   supabase.from('trip_items').select('*').eq('trip_id',state.trip.id).eq('user_id',state.user.id).order('created_at'),
   supabase.from('trip_bags').select('*').eq('trip_id',state.trip.id).eq('user_id',state.user.id).order('created_at'),
   supabase.from('trip_documents').select('*').eq('trip_id',state.trip.id).eq('user_id',state.user.id).order('created_at',{ascending:false}),
   supabase.from('trip_selection_batches_v3').select('*').eq('trip_id',state.trip.id).eq('user_id',state.user.id).order('created_at',{ascending:false})
 ]);
 for(const q of [items,bags,docs,batches])if(q.error)throw q.error;
 state.items=(items.data||[]).filter(x=>x.catalog_key_v3);state.bags=bags.data||[];state.documents=docs.data||[];state.batches=batches.data||[];
 const byKey=new Map(CATALOG.map(i=>[stableKey(i),i]));
 for(const row of state.items){const item=byKey.get(row.catalog_key_v3);if(item)state.draft.set(row.catalog_key_v3,draftFromSaved(row,item));}
}
async function loadAll(){await Promise.all([ensureProfile(),detectAdmin(),loadTrips()]);await loadTripData();}

function setView(view){state.view=view;document.querySelectorAll('[data-view]').forEach(el=>el.classList.toggle('hidden',el.dataset.view!==view));document.querySelectorAll('[data-nav]').forEach(b=>b.classList.toggle('active',b.dataset.nav===view));renderCurrent();window.scrollTo({top:0,behavior:'smooth'});}
function renderCurrent(){renderTop();if(state.view==='home')renderHome();if(state.view==='checklist')renderChecklist();if(state.view==='bags')renderBags();if(state.view==='documents')renderDocuments();if(state.view==='profile')renderProfile();if(state.view==='admin')renderAdmin();}
function renderTop(){
 $('avatar').textContent=initials();const sw=$('tripSwitcher');
 if(sw){sw.innerHTML=state.trip?`${icon('plane','sm')}<span>${esc(`SAP → ${state.trip.entry_airport||'USA'}`)}</span>${icon('chevron','sm')}`:`${icon('plus','sm')}<span>Crear viaje</span>`;}
}
function readiness(){
 if(!state.trip)return {score:0,packed:0,total:0,declare:0,attention:0,blocked:0,docs:0};
 const total=state.items.length,packed=state.items.filter(i=>i.packed).length,declare=state.items.filter(i=>i.computed_decision==='allowed_declare').length,attention=state.items.filter(i=>['review','restricted'].includes(i.computed_decision)).length,blocked=state.items.filter(i=>i.computed_decision==='prohibited').length,docs=state.documents.length;
 const tripFields=[state.trip.departure_date,state.trip.return_date,state.trip.entry_airport,state.trip.airline].filter(Boolean).length/4*100;
 const pack=total?packed/total*100:0,reg=blocked?0:attention?55:total?100:0,doc=Math.min(100,docs/3*100);
 return {score:Math.round((tripFields+pack+reg+doc)/4),packed,total,declare,attention,blocked,docs};
}
function renderHome(){
 const host=$('homeView'),r=readiness(),t=state.trip,d=t?daysUntil(t.departure_date):null;
 const travel=t?`<article class="travel-card"><div class="travel-top"><span class="eyebrow" style="color:#9eb1c5">Próximo viaje</span><span class="pill" style="background:rgba(255,255,255,.08);color:#fff">${d===0?'Hoy':d>0?`En ${d} días`:'En expediente'}</span></div><div class="travel-route"><strong>SAP</strong><span class="route-line"></span><strong>${esc(t.entry_airport||'USA')}</strong></div><div class="travel-meta"><span>Salida<b>${fmtShort(t.departure_date)}</b></span><span>Regreso<b>${fmtShort(t.return_date)}</b></span><span>Aerolínea<b>${esc(t.airline||'Pendiente')}</b></span></div></article>`:`<article class="travel-card"><div class="travel-top"><span class="eyebrow" style="color:#9eb1c5">EntrySafe USA</span></div><div class="travel-route"><strong>HN</strong><span class="route-line"></span><strong>USA</strong></div><p style="color:#c6d2df;max-width:520px">Crea tu primer viaje y prepara todo lo que llevarás con una sola checklist.</p><button class="btn secondary" data-action="new-trip">Crear viaje</button></article>`;
 host.innerHTML=`<div class="page-head"><div><p class="eyebrow">Tu espacio privado</p><h1>Hola, ${esc(userName())}.</h1><p>Marca lo que llevarás. EntrySafe calcula cantidades, equipaje, declaración y requisitos oficiales detrás.</p></div><div class="page-actions"><button class="btn primary" data-nav="checklist">${icon('check')} Preparar lo que llevaré</button></div></div><div class="home-grid">${travel}<article class="readiness surface"><div><p class="eyebrow">Preparación del viaje</p><h2 style="margin:0;font-size:24px;letter-spacing:-.04em">Estado general</h2><p class="muted">${r.blocked?'Hay artículos que no debes llevar.':r.attention?'Hay artículos que requieren revisión.':r.total?'Tu selección no tiene bloqueos detectados.':'Empieza marcando lo que llevarás.'}</p></div><div><strong class="big">${r.score}</strong><span class="muted"> / 100</span><div class="progress" style="margin-top:14px"><i style="width:${r.score}%"></i></div></div></article></div><div class="metric-grid"><article class="metric"><span class="metric-icon">${icon('list')}</span><div><strong>${r.total}</strong><span>Seleccionados</span></div></article><article class="metric"><span class="metric-icon">${icon('check')}</span><div><strong>${r.packed}</strong><span>Empacados</span></div></article><article class="metric"><span class="metric-icon">${icon('shield')}</span><div><strong>${r.declare}</strong><span>Para declarar</span></div></article><article class="metric"><span class="metric-icon">${icon('alert')}</span><div><strong>${r.blocked+r.attention}</strong><span>Por atender</span></div></article></div><div class="home-lower"><article class="panel"><div class="panel-head"><h2>Lo importante ahora</h2><button class="link-btn" data-nav="checklist">Abrir checklist</button></div><div class="status-list">${statusRow('Selecciona todo lo que llevarás',r.total?`${r.total} artículos guardados`:'Aún no has guardado tu selección','list',!!r.total)}${statusRow('Empaca por maleta',r.total?`${r.packed} de ${r.total} marcados como empacados`:'Se activa al guardar tu selección','suitcase',r.total>0&&r.packed===r.total)}${statusRow('Declaración',r.declare?`${r.declare} artículos requieren declaración`:'Sin artículos para declarar','shield',r.declare===0&&r.total>0)}${statusRow('Revisión final',r.blocked?`${r.blocked} artículo(s) no deben viajar`:r.attention?`${r.attention} artículo(s) requieren atención`:'Sin bloqueos detectados','check',r.total>0&&!r.blocked&&!r.attention)}</div></article><article class="panel"><div class="panel-head"><h2>Motor oficial</h2></div><p class="muted" style="line-height:1.65">USDA/APHIS, ACIR, CBP, TSA, FAA, FDA y USFWS se consultan según el tipo de artículo. La complejidad regulatoria queda detrás de tu checklist.</p><div class="trust-line"><span>USDA</span><span>CBP</span><span>TSA</span><span>FAA</span><span>FDA</span></div></article></div>`;
 bindActions(host);
}
function statusRow(title,copy,ico,done){return `<div class="status-row"><span class="status-dot">${icon(done?'check':ico,'sm')}</span><div><b>${esc(title)}</b><small>${esc(copy)}</small></div>${done?'<span class="pill ok">Listo</span>':''}</div>`;}

function renderCategories(){
 const counts=new Map();for(const s of SECTIONS)counts.set(s,CATALOG.filter(x=>x.section===s).length);
 $('categoryPanel').innerHTML=`<button class="${state.section==='all'?'active':''}" data-section="all"><span>Todos</span><span>${CATALOG.length}</span></button>`+SECTIONS.map(s=>`<button class="${state.section===s?'active':''}" data-section="${esc(s)}"><span>${esc(s)}</span><span>${counts.get(s)}</span></button>`).join('');
 $('categoryPanel').querySelectorAll('[data-section]').forEach(b=>b.addEventListener('click',()=>{state.section=b.dataset.section;renderChecklist();}));
}
function renderChecklist(){
 renderCategories();const list=$('checklistList'),q=state.query.trim();let rows=searchCatalog(q,state.section);
 if(!q&&state.section==='all')rows=rows.slice(0,260);
 $('catalogCount').textContent=`${rows.length}${!q&&state.section==='all'&&CATALOG.length>rows.length?` de ${CATALOG.length}`:''} opciones`;
 $('selectedCountTop').textContent=String(state.draft.size);
 list.innerHTML=rows.length?rows.map(productRow).join(''):`<div class="empty">No encontramos esa opción. Prueba otro nombre o una categoría distinta.</div>`;
 list.querySelectorAll('.check').forEach(cb=>cb.addEventListener('change',onToggle));
 list.querySelectorAll('[data-qty]').forEach(el=>el.addEventListener('change',onQtyChange));
 list.querySelectorAll('[data-qty-input]').forEach(el=>el.addEventListener('input',onQtyChange));
 list.querySelectorAll('[data-add-presentation]').forEach(b=>b.addEventListener('click',addPresentation));
 list.querySelectorAll('[data-remove-presentation]').forEach(b=>b.addEventListener('click',removePresentation));
 updateSelectionBar();
}
function productRow(item){
 const key=stableKey(item),d=state.draft.get(key),selected=!!d;
 const hint=item.common_hn?'Frecuente desde Honduras':item.section;
 return `<article class="product-row ${selected?'selected':''}" data-key="${key}"><div class="product-main"><input class="check" type="checkbox" aria-label="Seleccionar ${esc(item.name_es)}" data-key="${key}" ${selected?'checked':''}><span class="product-icon">${icon(item.icon_key||SECTION_ICON[item.section]||'box')}</span><div class="product-copy"><b>${esc(item.name_es)}</b><small>${esc(hint)}</small></div><div class="product-badges">${item.profile==='ordinary'?'<span class="pill">Equipaje</span>':item.profile.includes('prohibited')?'<span class="pill bad">Regulado</span>':'<span class="pill info">Revisión automática</span>'}</div></div>${selected?quantityEditor(key,d):''}</article>`;
}
function quantityEditor(key,d){
 const m=d.item.measurement_kind,profile=d.item.profile;
 if(m==='volume')return `<div class="qty-area"><div class="presentation-list">${(d.presentations||[]).map((p,i)=>presentationRow(key,p,i,'volume')).join('')}<button class="add-presentation" type="button" data-add-presentation="${key}">+ Otra presentación</button></div>${d.item.section==='Alcohol'?`<div class="qty-field"><label>Graduación</label><div style="display:flex;align-items:center;gap:6px"><input data-qty-input data-key="${key}" data-field="abvPercent" type="number" min="0" max="100" step="0.1" value="${Number(d.abvPercent||0)}"><span>%</span></div></div>`:''}<span class="pill">${profile.startsWith('alcohol')?'Se suman todos los envases':'Se revisa tamaño por envase y total'}</span></div>`;
 if(m==='mass')return `<div class="qty-area"><div class="qty-field"><label>Cantidad</label><input data-qty-input data-key="${key}" data-field="quantityValue" type="number" min="0.01" step="0.01" value="${Number(d.quantityValue||1)}"></div><div class="qty-field"><label>Unidad</label><select data-qty data-key="${key}" data-field="quantityUnit">${unitOptions('mass',d.quantityUnit)}</select></div><span class="pill">EntrySafe convierte automáticamente</span></div>`;
 if(m==='days')return `<div class="qty-area"><div class="qty-field"><label>Días de suministro</label><input data-qty-input data-key="${key}" data-field="daysSupply" type="number" min="1" max="365" step="1" value="${Number(d.daysSupply||30)}"></div><span class="pill">Referencia FDA: uso personal</span></div>`;
 if(m==='money')return `<div class="qty-area"><div class="qty-field"><label>Monto equivalente en USD</label><input data-qty-input data-key="${key}" data-field="quantityValue" type="number" min="0" step="1" value="${Number(d.quantityValue||0)}"></div><span class="pill">Umbral federal de reporte: más de $10,000</span></div>`;
 if(['power_bank_100','power_bank_160','battery_over160','vape'].includes(profile))return `<div class="qty-area"><div class="qty-field"><label>Cantidad</label><input data-qty-input data-key="${key}" data-field="quantityValue" type="number" min="1" step="1" value="${Number(d.quantityValue||1)}"></div><div class="qty-field"><label>Capacidad Wh</label><input data-qty-input data-key="${key}" data-field="batteryWh" type="number" min="0" step="1" value="${Number(d.batteryWh||0)}"></div><span class="pill">Batería: ubicación y límite FAA</span></div>`;
 return `<div class="qty-area"><div class="qty-field"><label>Cantidad</label><input data-qty-input data-key="${key}" data-field="quantityValue" type="number" min="1" step="1" value="${Number(d.quantityValue||1)}"></div><div class="qty-field"><label>Unidad</label><select data-qty data-key="${key}" data-field="quantityUnit">${unitOptions('count',d.quantityUnit)}</select></div></div>`;
}
function presentationRow(key,p,i,kind){return `<div class="presentation-row"><div class="qty-field"><label>Cantidad</label><input data-qty-input data-key="${key}" data-presentation="${i}" data-field="count" type="number" min="1" step="1" value="${Number(p.count||1)}"></div><div class="qty-field"><label>Tamaño</label><input data-qty-input data-key="${key}" data-presentation="${i}" data-field="size" type="number" min="0.01" step="0.01" value="${Number(p.size||100)}"></div><div class="qty-field"><label>Unidad</label><select data-qty data-key="${key}" data-presentation="${i}" data-field="unit">${unitOptions(kind,p.unit)}</select></div>${i?`<button class="mini-remove" type="button" aria-label="Quitar presentación" data-remove-presentation="${key}" data-index="${i}">${icon('close','sm')}</button>`:''}</div>`;}
function unitOptions(kind,current){return (UNIT_OPTIONS[kind]||UNIT_OPTIONS.count).map(u=>`<option value="${u}" ${u===current?'selected':''}>${esc(UNIT_LABEL[u]||u)}</option>`).join('');}
function onToggle(event){const key=event.target.dataset.key,item=CATALOG.find(x=>stableKey(x)===key);if(!item)return;if(event.target.checked)state.draft.set(key,defaultDraft(item));else state.draft.delete(key);renderChecklist();}
function onQtyChange(event){const key=event.target.dataset.key,d=state.draft.get(key);if(!d)return;const field=event.target.dataset.field,index=event.target.dataset.presentation;const value=event.target.type==='number'?Number(event.target.value):event.target.value;if(index!==undefined){d.presentations[Number(index)][field]=value;}else d[field]=value;updateSelectionBar();}
function addPresentation(event){const key=event.currentTarget.dataset.addPresentation,d=state.draft.get(key);if(!d)return;const alcohol=d.item.section==='Alcohol';d.presentations.push({count:1,size:alcohol?118:100,unit:'ml'});renderChecklist();}
function removePresentation(event){const key=event.currentTarget.dataset.removePresentation,d=state.draft.get(key);if(!d)return;d.presentations.splice(Number(event.currentTarget.dataset.index),1);renderChecklist();}
function updateSelectionBar(){const bar=$('selectionBar'),count=state.draft.size;$('selectionCount').textContent=String(count);bar.classList.toggle('hidden',!count);$('saveSelectionBtn').disabled=!count||!state.trip;}

async function saveSelection(){
 if(!state.trip)return openTripDialog();const items=[...state.draft.values()].map(serializeDraft);if(!items.length)return;
 const btn=$('saveSelectionBtn');const old=btn.innerHTML;btn.disabled=true;btn.textContent='Verificando fuentes y límites…';
 try{
   const {data,error}=await supabase.functions.invoke('evaluate-trip-selection-v3',{body:{tripId:state.trip.id,items,catalogVersion:CATALOG_VERSION,entryState:state.trip.entry_state||null}});if(error)throw error;if(!data?.ok)throw new Error(data?.error||'No se pudo guardar la selección.');state.lastResult=data;await loadTripData();renderCurrent();renderBatchResult(data);openDialog('resultDialog');toast('Selección guardada y verificada.','success');
 }catch(error){fail(error);}finally{btn.disabled=false;btn.innerHTML=old;updateSelectionBar();}
}
function renderBatchResult(result){
 const s=result.summary||{},items=result.items||[],checks=result.aggregateChecks||[];$('resultSummary').innerHTML=`<div class="summary-strip"><div class="summary-chip"><strong>${s.total||0}</strong><span>Guardados</span></div><div class="summary-chip"><strong>${s.ready||0}</strong><span>Listos</span></div><div class="summary-chip"><strong>${s.declare||0}</strong><span>Declarar</span></div><div class="summary-chip"><strong>${s.attention||0}</strong><span>Atención</span></div><div class="summary-chip"><strong>${s.blocked||0}</strong><span>No llevar</span></div></div>`;
 $('aggregateChecks').innerHTML=checks.length?`<div class="aggregate">${checks.map(c=>`<div class="aggregate-row ${c.status}"><b>${esc(c.label)}</b><p>${esc(c.message)}</p></div>`).join('')}</div>`:'<p class="muted">No hubo límites acumulativos que mostrar.</p>';
 $('resultItems').innerHTML=items.map(i=>`<div class="result-item"><div><b>${esc(i.name)}</b><small>${esc(BAG_LABEL[i.recommendedBag]||i.recommendedBag||'')}</small></div><span class="decision ${decisionTone(i.decision)}">${esc(DECISION_LABEL[i.decision]||i.decision)}</span></div>`).join('');
 const sourceMap=new Map();for(const i of items)for(const src of i.sources||[])if(src.url)sourceMap.set(src.url,src);$('resultSources').innerHTML=[...sourceMap.values()].map(src=>`<a class="source-card" href="${esc(src.url)}" target="_blank" rel="noopener"><span class="product-icon">${icon('link')}</span><div><b>${esc(src.agency)} · ${esc(src.title)}</b><small>${src.reachable===false?'Fuente no respondió en esta consulta':'Fuente oficial consultada'}${src.checkedAt?` · ${new Date(src.checkedAt).toLocaleDateString('es-HN')}`:''}</small></div>${icon('arrow','sm')}</a>`).join('');
}

function renderBags(){
 const host=$('bagsView');if(!state.trip){host.innerHTML=noTrip();return;}const groups={carry_on:[],checked:[],either:[],attention:[]};for(const item of state.items){const b=item.recommended_bag_v3||'either';if(b==='carry_on'||b==='carry_on_preferred')groups.carry_on.push(item);else if(b==='checked'||b==='checked_if_over_100ml')groups.checked.push(item);else if(['conditional','none'].includes(b)||['review','prohibited'].includes(item.computed_decision))groups.attention.push(item);else groups.either.push(item);}
 host.innerHTML=`<div class="page-head"><div><p class="eyebrow">Ubicación inteligente</p><h1>Mis maletas</h1><p>EntrySafe organiza la selección según reglas TSA/FAA y te señala lo que requiere atención.</p></div><div class="page-actions"><button class="btn primary" data-nav="checklist">${icon('plus')} Cambiar selección</button></div></div><div class="bag-cards">${bagCard('Carry-on','Baterías, dispositivos y artículos que deben ir contigo','suitcase',groups.carry_on)}${bagCard('Facturada','Artículos que por tamaño o regla deben ir facturados','box',groups.checked)}${bagCard('Flexible','Puede viajar en cualquiera de las dos según condiciones','check',groups.either)}</div><div class="panel" style="margin-top:18px"><div class="panel-head"><h2>Atención antes de empacar</h2><span class="pill ${groups.attention.length?'warn':'ok'}">${groups.attention.length}</span></div>${groups.attention.length?`<div class="saved-list">${groups.attention.map(savedItemRow).join('')}</div>`:'<div class="empty">No hay artículos con ubicación pendiente.</div>'}</div>`;bindActions(host);
}
function bagCard(title,copy,ico,items){return `<article class="bag-card surface"><span class="metric-icon">${icon(ico)}</span><h3>${esc(title)}</h3><p>${esc(copy)}</p><div class="bag-list">${items.slice(0,8).map(i=>`<div>${esc(i.custom_name||'Artículo')}</div>`).join('')}${items.length>8?`<div>+ ${items.length-8} más</div>`:''}</div></article>`;}
function savedItemRow(i){return `<div class="saved-item"><span class="product-icon">${icon('box')}</span><div><b>${esc(i.custom_name||'Artículo')}</b><small>${esc(BAG_LABEL[i.recommended_bag_v3]||i.recommended_bag_v3||'')}</small></div><span class="decision ${decisionTone(i.computed_decision)}">${esc(DECISION_LABEL[i.computed_decision]||i.computed_decision)}</span></div>`;}

function renderDocuments(){
 const host=$('documentsView');if(!state.trip){host.innerHTML=noTrip();return;}host.innerHTML=`<div class="page-head"><div><p class="eyebrow">Expediente privado</p><h1>Documentos</h1><p>Pasaporte, visa, reservas y respaldo médico del viaje.</p></div><div class="page-actions"><button class="btn primary" id="addDocumentBtn">${icon('plus')} Agregar documento</button></div></div><div class="panel"><div class="saved-list">${state.documents.length?state.documents.map(d=>`<div class="saved-item"><span class="product-icon">${icon('document')}</span><div><b>${esc(documentLabel(d.document_type))}</b><small>${d.expires_on?`Vence ${fmtDate(d.expires_on)}`:'Sin vencimiento registrado'}${d.masked_identifier?` · ${esc(d.masked_identifier)}`:''}</small></div><span class="pill">Privado</span></div>`).join(''):'<div class="empty">Todavía no agregaste documentos a este viaje.</div>'}</div></div>`;$('addDocumentBtn')?.addEventListener('click',()=>openDialog('documentDialog'));
}
function documentLabel(v){return ({passport:'Pasaporte',visa:'Visa estadounidense',i94:'I-94',ticket:'Boleto aéreo',hotel:'Reserva de hotel',insurance:'Seguro de viaje',prescription:'Receta / carta médica',other:'Otro documento'})[v]||'Documento';}

function renderProfile(){
 const host=$('profileView');host.innerHTML=`<div class="page-head"><div><p class="eyebrow">Cuenta</p><h1>Perfil</h1><p>Estos datos se reutilizan para verificar requisitos que dependen de edad sin preguntarte en cada artículo.</p></div></div><div class="saved-grid"><form id="profileForm" class="panel"><div class="form-grid"><label class="field full"><span>Nombre para mostrar</span><input id="profileName" value="${esc(state.profile?.display_name||'')}"></label><label class="field"><span>Fecha de nacimiento</span><input id="profileDob" type="date" value="${esc(state.profile?.date_of_birth||'')}"></label><label class="field"><span>País base</span><input value="Honduras" disabled></label></div><div class="dialog-actions"><button class="btn primary" type="submit">Guardar perfil</button></div></form><article class="panel"><p class="eyebrow">Privacidad</p><h2 style="margin:0 0 8px">Tu expediente es privado</h2><p class="muted" style="line-height:1.6">La fecha de nacimiento se usa únicamente para reglas como alcohol/tabaco. Tus registros están aislados por usuario mediante RLS.</p>${state.isAdmin?'<button class="btn secondary" data-nav="admin">Abrir administración</button>':''}<button class="btn ghost" id="logoutBtn" style="margin-top:10px">Cerrar sesión</button></article></div>`;
 $('profileForm').addEventListener('submit',saveProfile);$('logoutBtn').addEventListener('click',()=>supabase.auth.signOut());bindActions(host);
}
async function saveProfile(e){e.preventDefault();const payload={display_name:$('profileName').value.trim()||'Viajero',date_of_birth:$('profileDob').value||null};const q=await supabase.from('profiles').update(payload).eq('user_id',state.user.id).select('*').single();if(q.error)return fail(q.error);state.profile=q.data;renderCurrent();toast('Perfil actualizado.','success');}
function renderAdmin(){const host=$('adminView');if(!state.isAdmin){host.innerHTML='<div class="empty">No tienes acceso administrativo.</div>';return;}host.innerHTML=`<div class="page-head"><div><p class="eyebrow">Regulatory Control Center</p><h1>Administración</h1><p>Catálogo 3.0, lotes regulatorios y trazabilidad de decisiones.</p></div></div><div class="metric-grid"><article class="metric"><span class="metric-icon">${icon('list')}</span><div><strong>${CATALOG.length}</strong><span>Opciones visibles</span></div></article><article class="metric"><span class="metric-icon">${icon('layers')}</span><div><strong>${SECTIONS.length}</strong><span>Secciones</span></div></article><article class="metric"><span class="metric-icon">${icon('shield')}</span><div><strong>${state.batches.length}</strong><span>Lotes del viaje</span></div></article><article class="metric"><span class="metric-icon">${icon('link')}</span><div><strong>7</strong><span>Familias de autoridad</span></div></article></div><div class="panel" style="margin-top:20px"><div class="panel-head"><h2>Últimos lotes</h2><span class="pill">${esc(CATALOG_VERSION)}</span></div><div class="saved-list">${state.batches.slice(0,12).map(b=>`<div class="saved-item"><span class="product-icon">${icon('shield')}</span><div><b>${b.item_count} artículos evaluados</b><small>${new Date(b.created_at).toLocaleString('es-HN')} · motor ${esc(b.summary?.engineVersion||'v3')}</small></div><span class="pill">${b.summary?.blocked||0} bloqueados</span></div>`).join('')||'<div class="empty">No hay lotes todavía.</div>'}</div></div>`;}
function noTrip(){return `<div class="page-head"><div><p class="eyebrow">EntrySafe</p><h1>Primero crea un viaje.</h1><p>La checklist, maletas y documentos quedan asociados al viaje.</p></div><button class="btn primary" data-action="new-trip">Crear viaje</button></div>`;}

function bindActions(root=document){root.querySelectorAll('[data-nav]').forEach(b=>b.addEventListener('click',()=>setView(b.dataset.nav)));root.querySelectorAll('[data-action="new-trip"]').forEach(b=>b.addEventListener('click',openTripDialog));}
function openTripDialog(){
 $('tripForm').reset();$('tripDeparture').value=new Date(Date.now()+7*86400000).toISOString().slice(0,10);openDialog('tripDialog');
}
async function createTrip(e){e.preventDefault();const payload={user_id:state.user.id,origin_country:'HN',destination_country:'US',departure_date:$('tripDeparture').value,return_date:$('tripReturn').value||null,entry_airport:$('tripAirport').value.trim().toUpperCase(),entry_state:$('tripState').value.trim().toUpperCase()||null,airline:$('tripAirline').value.trim()||null,flight_number:$('tripFlight').value.trim()||null,purpose:$('tripPurpose').value,status:'planned'};const q=await supabase.from('trips').insert(payload).select('*').single();if(q.error)return fail(q.error);state.trips.unshift(q.data);state.trip=q.data;localStorage.setItem('entrysafe-v3-trip',q.data.id);await loadTripData();closeDialog('tripDialog');renderCurrent();toast('Viaje creado. Ahora marca lo que llevarás.','success');setView('checklist');}
async function saveDocument(e){e.preventDefault();if(!state.trip)return;const file=$('documentFile').files?.[0];let path=null;if(file){path=`${state.user.id}/${state.trip.id}/${crypto.randomUUID()}-${file.name.replace(/[^a-zA-Z0-9._-]/g,'_')}`;const up=await supabase.storage.from('travel-documents').upload(path,file,{upsert:false});if(up.error)return fail(up.error);}const payload={trip_id:state.trip.id,user_id:state.user.id,document_type:$('documentType').value,masked_identifier:$('documentMasked').value.trim()||null,expires_on:$('documentExpiry').value||null,storage_path:path};const q=await supabase.from('trip_documents').insert(payload);if(q.error)return fail(q.error);closeDialog('documentDialog');$('documentForm').reset();await loadTripData();renderDocuments();toast('Documento guardado.','success');}

function showTripPicker(){if(!state.trips.length)return openTripDialog();$('tripList').innerHTML=state.trips.map(t=>`<button class="source-card" style="width:100%;background:#fff;text-align:left" data-trip="${t.id}"><span class="product-icon">${icon('plane')}</span><div><b>${esc(`SAP → ${t.entry_airport||'USA'}`)}</b><small>${fmtDate(t.departure_date)} · ${esc(t.airline||'Aerolínea pendiente')}</small></div>${state.trip?.id===t.id?'<span class="pill ok">Activo</span>':icon('arrow','sm')}</button>`).join('');$('tripList').querySelectorAll('[data-trip]').forEach(b=>b.addEventListener('click',async()=>{state.trip=state.trips.find(t=>t.id===b.dataset.trip);localStorage.setItem('entrysafe-v3-trip',state.trip.id);await loadTripData();closeDialog('tripPicker');renderCurrent();}));openDialog('tripPicker');}

function signedOut(){state.session=null;state.user=null;state.profile=null;state.trips=[];state.trip=null;state.items=[];state.draft.clear();$('authView').classList.remove('hidden');$('appView').classList.add('hidden');}
async function signedIn(session){state.session=session;state.user=session.user||await supabase.auth.getSession().then(x=>x.data.session?.user);if(!state.user)throw new Error('No se pudo cargar tu usuario.');await loadAll();$('authView').classList.add('hidden');$('appView').classList.remove('hidden');renderCurrent();}
async function login(e){e.preventDefault();const btn=$('loginBtn'),old=btn.textContent;btn.disabled=true;btn.textContent='Ingresando…';try{const r=await supabase.auth.signInWithPassword({email:$('emailInput').value.trim(),password:$('passwordInput').value});if(r.error)throw r.error;await signedIn(r.data.session);}catch(error){fail(error);}finally{btn.disabled=false;btn.textContent=old;}}
async function signup(){const email=$('emailInput').value.trim(),password=$('passwordInput').value;if(!email||password.length<8)return toast('Escribe correo y una contraseña de al menos 8 caracteres.','error');const r=await supabase.auth.signUp({email,password,options:{emailRedirectTo:location.origin}});if(r.error)return fail(r.error);if(r.data.session)await signedIn(r.data.session);else toast('Cuenta creada. Revisa tu correo para confirmar el acceso.','success');}
async function recover(){const email=$('emailInput').value.trim();if(!email)return toast('Escribe tu correo primero.','error');const r=await supabase.auth.resetPasswordForEmail(email,{redirectTo:location.origin});if(r.error)return fail(r.error);toast('Te enviamos las instrucciones de recuperación.','success');}

function bindStatic(){
 $('authForm').addEventListener('submit',login);$('signupBtn').addEventListener('click',signup);$('forgotBtn').addEventListener('click',recover);$('togglePassword').addEventListener('click',()=>{$('passwordInput').type=$('passwordInput').type==='password'?'text':'password';});
 bindActions(document);$('tripSwitcher').addEventListener('click',showTripPicker);$('tripForm').addEventListener('submit',createTrip);$('documentForm').addEventListener('submit',saveDocument);$('saveSelectionBtn').addEventListener('click',saveSelection);$('checklistSearch').addEventListener('input',e=>{state.query=e.target.value;renderChecklist();});
 document.querySelectorAll('[data-close]').forEach(b=>b.addEventListener('click',()=>closeDialog(b.dataset.close)));
 $('newTripPickerBtn').addEventListener('click',()=>{closeDialog('tripPicker');openTripDialog();});
 $('avatar').addEventListener('click',()=>setView('profile'));
}
async function boot(){bindStatic();const s=await supabase.auth.getSession();if(s.data.session)await signedIn(s.data.session);else signedOut();supabase.auth.onAuthStateChange((event,session)=>{if(event==='SIGNED_OUT')signedOut();else if(session&&!state.session)setTimeout(()=>signedIn(session).catch(fail),0);});if('serviceWorker' in navigator)window.addEventListener('load',()=>navigator.serviceWorker.register('./sw.js').catch(()=>{}));}

boot().catch(fail);
