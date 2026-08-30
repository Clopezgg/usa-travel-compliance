import { createClient } from './supabase-local.js';
import { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY } from './config.js';

const supabase=createClient(SUPABASE_URL,SUPABASE_PUBLISHABLE_KEY,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
const $=id=>document.getElementById(id);
let editingTripId=null;

const esc=(v='')=>String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
const fmtDate=v=>v?new Date(`${v}T12:00:00`).toLocaleDateString('es-HN',{day:'numeric',month:'short',year:'numeric'}).replace('.',''):'Pendiente';
function icon(name,cls=''){return `<svg class="icon ${cls}" aria-hidden="true"><use href="#i-${name}"></use></svg>`;}
function toast(message,type=''){const t=$('toast');if(!t)return;t.textContent=message;t.className=`toast ${type}`;clearTimeout(toast.timer);toast.timer=setTimeout(()=>t.classList.add('hidden'),4200);}
function fail(error){console.error(error);toast(error?.message||String(error)||'No se pudo completar la operación.','error');}
function closeDialog(id){const d=$(id);if(d?.open)d.close();}
function openDialog(id){const d=$(id);if(d&&!d.open)d.showModal();}

function ensureStyles(){
 if(document.getElementById('entrysafe-trip-manager-style'))return;
 const style=document.createElement('style');style.id='entrysafe-trip-manager-style';style.textContent=`
 .trip-manager-row{display:grid;grid-template-columns:minmax(0,1fr) auto;align-items:center;gap:12px;padding:10px 12px;border:1px solid #dfe6ec;border-radius:16px;background:#fff}
 .trip-manager-main{appearance:none;border:0;background:transparent;padding:4px 2px;display:grid;grid-template-columns:auto minmax(0,1fr) auto;align-items:center;gap:12px;text-align:left;min-width:0;cursor:pointer;color:inherit}
 .trip-manager-main>div{min-width:0}.trip-manager-main b,.trip-manager-main small{display:block}.trip-manager-main small{margin-top:3px;color:#697586;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
 .trip-manager-actions{display:flex;align-items:center;gap:6px}.trip-manager-action{border:1px solid #dfe6ec;background:#fff;color:#23364b;border-radius:10px;padding:8px 10px;font:inherit;font-size:12px;font-weight:750;cursor:pointer}.trip-manager-action:hover{background:#f4f7fa}.trip-manager-action.delete{color:#b42318;border-color:#f1c8c4}.trip-manager-action.delete:hover{background:#fff4f2}
 @media(max-width:620px){.trip-manager-row{grid-template-columns:1fr}.trip-manager-actions{justify-content:flex-end}.trip-manager-main{grid-template-columns:auto minmax(0,1fr) auto}}
 `;document.head.appendChild(style);
}

async function currentUser(){const s=await supabase.auth.getSession();return {session:s.data.session,user:s.data.session?.user||null};}
async function fetchTrips(){const {user}=await currentUser();if(!user)throw new Error('Tu sesión expiró. Vuelve a iniciar sesión.');const q=await supabase.from('trips').select('*').eq('user_id',user.id).order('departure_date',{ascending:false});if(q.error)throw q.error;return q.data||[];}
function selectedTripId(trips){const remembered=localStorage.getItem('entrysafe-v3-trip');if(trips.some(t=>t.id===remembered))return remembered;const today=new Date().toISOString().slice(0,10);return [...trips].filter(t=>t.status!=='cancelled'&&t.departure_date>=today).sort((a,b)=>String(a.departure_date).localeCompare(String(b.departure_date)))[0]?.id||trips.find(t=>t.status==='active')?.id||trips[0]?.id||null;}

function setTripFormMode(trip=null){
 editingTripId=trip?.id||null;const form=$('tripForm');if(!form)return;form.reset();
 const eyebrow=$('tripDialog')?.querySelector('.dialog-head .eyebrow');const title=$('tripDialog')?.querySelector('.dialog-head h2');const submit=form.querySelector('button[type="submit"]');
 if(trip){
  if(eyebrow)eyebrow.textContent='Editar viaje';if(title)title.textContent=`Honduras → ${trip.entry_airport||'Estados Unidos'}`;if(submit)submit.textContent='Guardar cambios';
  $('tripDeparture').value=trip.departure_date||'';$('tripReturn').value=trip.return_date||'';$('tripAirport').value=trip.entry_airport||'';$('tripState').value=trip.entry_state||'';$('tripAirline').value=trip.airline||'';$('tripFlight').value=trip.flight_number||'';$('tripPurpose').value=trip.purpose||'tourism';
 }else{
  if(eyebrow)eyebrow.textContent='Nuevo viaje';if(title)title.textContent='Honduras → Estados Unidos';if(submit)submit.textContent='Crear viaje';
  $('tripDeparture').value=new Date(Date.now()+7*86400000).toISOString().slice(0,10);
 }
}

async function selectTrip(id){localStorage.setItem('entrysafe-v3-trip',id);closeDialog('tripPicker');location.reload();}
async function editTrip(id){try{const trips=await fetchTrips(),trip=trips.find(t=>t.id===id);if(!trip)throw new Error('Ese viaje ya no existe.');closeDialog('tripPicker');setTripFormMode(trip);openDialog('tripDialog');}catch(error){fail(error);}}

async function removeStoredDocuments(tripId,userId,session){
 try{
  const q=await supabase.from('trip_documents').select('storage_path').eq('trip_id',tripId).eq('user_id',userId);if(q.error)throw q.error;
  const prefixes=(q.data||[]).map(x=>x.storage_path).filter(Boolean);if(!prefixes.length)return;
  const response=await fetch(`${SUPABASE_URL}/storage/v1/object/travel-documents`,{method:'DELETE',headers:{apikey:SUPABASE_PUBLISHABLE_KEY,Authorization:`Bearer ${session.access_token}`,'Content-Type':'application/json'},body:JSON.stringify({prefixes}),cache:'no-store'});
  if(!response.ok)console.warn('EntrySafe could not remove one or more stored trip documents before deleting the trip.',response.status);
 }catch(error){console.warn('EntrySafe document cleanup warning',error);}
}

async function deleteTrip(id){
 try{
  const trips=await fetchTrips(),trip=trips.find(t=>t.id===id);if(!trip)throw new Error('Ese viaje ya no existe.');
  const ok=window.confirm(`¿Eliminar el viaje SAP → ${trip.entry_airport||'USA'} del ${fmtDate(trip.departure_date)}?\n\nSe eliminarán también su checklist, maletas, documentos registrados y verificaciones. Esta acción no se puede deshacer.`);if(!ok)return;
  const {session,user}=await currentUser();if(!session||!user)throw new Error('Tu sesión expiró. Vuelve a iniciar sesión.');
  await removeStoredDocuments(id,user.id,session);
  const q=await supabase.from('trips').delete().eq('id',id).eq('user_id',user.id);if(q.error)throw q.error;
  if(localStorage.getItem('entrysafe-v3-trip')===id)localStorage.removeItem('entrysafe-v3-trip');
  closeDialog('tripPicker');toast('Viaje eliminado.','success');setTimeout(()=>location.reload(),220);
 }catch(error){fail(error);}
}

async function renderTripPicker(){
 try{
  ensureStyles();const trips=await fetchTrips();if(!trips.length){setTripFormMode(null);openDialog('tripDialog');return;}
  const activeId=selectedTripId(trips),host=$('tripList');if(!host)return;
  host.innerHTML=trips.map(t=>`<div class="trip-manager-row"><button class="trip-manager-main" type="button" data-trip-select="${t.id}" aria-label="Seleccionar viaje a ${esc(t.entry_airport||'Estados Unidos')}"><span class="product-icon">${icon('plane')}</span><div><b>${esc(`SAP → ${t.entry_airport||'USA'}`)}</b><small>${fmtDate(t.departure_date)} · ${esc(t.airline||'Aerolínea pendiente')}</small></div>${activeId===t.id?'<span class="pill ok">Activo</span>':icon('arrow','sm')}</button><div class="trip-manager-actions"><button class="trip-manager-action" type="button" data-trip-edit="${t.id}">Editar</button><button class="trip-manager-action delete" type="button" data-trip-delete="${t.id}">Eliminar</button></div></div>`).join('');
  host.querySelectorAll('[data-trip-select]').forEach(b=>b.addEventListener('click',()=>selectTrip(b.dataset.tripSelect)));
  host.querySelectorAll('[data-trip-edit]').forEach(b=>b.addEventListener('click',()=>editTrip(b.dataset.tripEdit)));
  host.querySelectorAll('[data-trip-delete]').forEach(b=>b.addEventListener('click',()=>deleteTrip(b.dataset.tripDelete)));
  openDialog('tripPicker');
 }catch(error){fail(error);}
}

async function saveEditedTrip(event){
 if(!editingTripId)return;
 event.preventDefault();event.stopImmediatePropagation();
 const departure=$('tripDeparture').value,returnDate=$('tripReturn').value||null;if(returnDate&&returnDate<departure)return toast('La fecha de regreso no puede ser anterior a la salida.','error');
 const {user}=await currentUser();if(!user)return fail(new Error('Tu sesión expiró. Vuelve a iniciar sesión.'));
 const submit=$('tripForm').querySelector('button[type="submit"]'),old=submit.textContent;submit.disabled=true;submit.textContent='Guardando…';
 try{
  const payload={departure_date:departure,return_date:returnDate,entry_airport:$('tripAirport').value.trim().toUpperCase(),entry_state:$('tripState').value.trim().toUpperCase()||null,airline:$('tripAirline').value.trim()||null,flight_number:$('tripFlight').value.trim()||null,purpose:$('tripPurpose').value};
  const q=await supabase.from('trips').update(payload).eq('id',editingTripId).eq('user_id',user.id).select('*').single();if(q.error)throw q.error;
  localStorage.setItem('entrysafe-v3-trip',editingTripId);closeDialog('tripDialog');toast('Viaje actualizado.','success');editingTripId=null;setTimeout(()=>location.reload(),220);
 }catch(error){fail(error);submit.disabled=false;submit.textContent=old;}
}

function bind(){
 ensureStyles();
 $('tripSwitcher')?.addEventListener('click',event=>{event.preventDefault();event.stopImmediatePropagation();renderTripPicker();},true);
 $('tripForm')?.addEventListener('submit',saveEditedTrip,true);
 $('newTripPickerBtn')?.addEventListener('click',()=>setTripFormMode(null),true);
 document.addEventListener('click',event=>{if(event.target.closest('[data-action="new-trip"]'))setTripFormMode(null);},true);
 $('tripDialog')?.addEventListener('close',()=>{editingTripId=null;});
}

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',bind,{once:true});else bind();
