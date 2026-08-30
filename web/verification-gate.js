import { createClient } from './supabase-local.js';
import { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY } from './config.js';

const client = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
});

const $ = id => document.getElementById(id);
const esc = (value='') => String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
const decisionLabel = v => ({allowed:'Permitido',allowed_declare:'Permitido con declaración',restricted:'Permitido con condiciones',prohibited:'No permitido',review:'Revisión obligatoria'})[v] || 'Revisión obligatoria';
const riskLabel = v => ({low:'Bajo',medium:'Medio',high:'Alto',review:'Revisar'})[v] || 'Revisar';

function ensurePanel(){
  let panel=$('verificationResult');
  if(panel)return panel;
  panel=document.createElement('section');
  panel.id='verificationResult';
  panel.className='verification-result hidden';
  const footer=$('itemForm')?.querySelector('.sheet-footer');
  footer?.before(panel);
  return panel;
}

function resetVerification(){
  const form=$('itemForm');
  if(!form)return;
  delete form.dataset.verificationApproved;
  delete form.dataset.verificationId;
  const panel=ensurePanel();
  panel.className='verification-result hidden';
  panel.innerHTML='';
}

function attrs(){
  return {
    cooked_state:$('cookedState')?.value || 'not_applicable',
    homemade:!!$('homemade')?.checked,
    commercial_packaging:!!$('commercialPackaging')?.checked,
    hermetically_sealed:!!$('sealed')?.checked,
    shelf_stable:!!$('shelfStable')?.checked,
    contains_meat:!!$('containsMeat')?.checked,
    bag_type:$('itemBag')?.selectedOptions?.[0]?.textContent || 'Sin asignar'
  };
}

function renderResult(result){
  const panel=ensurePanel();
  const tone=result.decision==='prohibited'?'blocked':result.decision==='review'?'review':result.decision==='restricted'?'conditional':'approved';
  const sourceRows=(result.sources||[]).filter(s=>s?.url).map(s=>`<a href="${esc(s.url)}" target="_blank" rel="noopener"><span>${esc(s.agency||'Fuente oficial')}</span><small>${s.reachable===false?'No respondió en esta consulta':'Consultada'} · abrir fuente ↗</small></a>`).join('');
  const requirements=(result.requirements||[]).map(r=>`<li>${esc(r)}</li>`).join('');
  panel.className=`verification-result ${tone}`;
  panel.innerHTML=`
    <div class="verification-head">
      <div><span class="verification-kicker">VERIFICACIÓN OFICIAL</span><h3>${esc(decisionLabel(result.decision))}</h3></div>
      <span class="verification-risk">Riesgo ${esc(riskLabel(result.riskLevel))}</span>
    </div>
    <p class="verification-explanation">${esc(result.explanation||'')}</p>
    ${requirements?`<div class="verification-requirements"><b>Limitaciones y requisitos</b><ul>${requirements}</ul></div>`:''}
    ${sourceRows?`<div class="verification-sources"><b>Fuentes consultadas</b>${sourceRows}</div>`:''}
    <div class="verification-meta">Verificado: ${new Date(result.verifiedAt||Date.now()).toLocaleString('es-HN')} · ${esc(result.sourceMode||'oficial')}</div>
    <div id="verificationAction"></div>`;
  panel.scrollIntoView({behavior:'smooth',block:'nearest'});
  return panel;
}

async function verify({acknowledgeRestricted=false}={}){
  const productName=$('itemSearch')?.value?.trim();
  if(!productName)throw new Error('Escribe el nombre del producto que quieres llevar.');
  const {data:{session}}=await client.auth.getSession();
  if(!session)throw new Error('Tu sesión expiró. Vuelve a iniciar sesión.');
  const {data,error}=await client.functions.invoke('verify-travel-product',{
    body:{
      productName,
      originCountry:'HN',
      destinationRegion:'US_CONTINENTAL',
      attributes:attrs(),
      acknowledgeRestricted
    }
  });
  if(error)throw error;
  if(!data?.ok)throw new Error(data?.error||'No se pudo completar la verificación oficial.');
  return data;
}

function approveAndSubmit(result){
  const form=$('itemForm');
  form.dataset.verificationApproved='true';
  form.dataset.verificationId=result.verificationId||'';
  form.requestSubmit();
}

async function handleGate(event){
  const form=$('itemForm');
  if(form?.dataset.verificationApproved==='true'){
    delete form.dataset.verificationApproved;
    return;
  }
  event.preventDefault();
  event.stopImmediatePropagation();
  const submit=form?.querySelector('button[type="submit"]');
  const original=submit?.textContent;
  if(submit){submit.disabled=true;submit.textContent='Consultando USDA / CBP / TSA…';}
  try{
    const result=await verify();
    const panel=renderResult(result);
    const action=panel.querySelector('#verificationAction');
    if(result.decision==='prohibited'){
      action.innerHTML='<div class="verification-blocked-note">Este producto no se guardará en tu maleta.</div>';
      return;
    }
    if(result.decision==='review'){
      action.innerHTML='<div class="verification-blocked-note">No hay evidencia suficiente para marcarlo como aceptado. El guardado queda bloqueado para evitar un falso “permitido”.</div>';
      return;
    }
    if(result.decision==='restricted' && result.requiresAcknowledgement){
      action.innerHTML='<button id="ackRestrictedBtn" class="gold-button full-button" type="button">Confirmo que cumpliré todos los requisitos</button>';
      $('ackRestrictedBtn')?.addEventListener('click',async()=>{
        const btn=$('ackRestrictedBtn');
        btn.disabled=true;btn.textContent='Verificando condiciones…';
        try{
          const confirmed=await verify({acknowledgeRestricted:true});
          renderResult(confirmed);
          if(confirmed.canSave){
            const target=$('verificationAction');
            target.innerHTML='<button id="saveVerifiedBtn" class="gold-button full-button" type="button">Guardar producto verificado</button>';
            $('saveVerifiedBtn')?.addEventListener('click',()=>approveAndSubmit(confirmed),{once:true});
          }
        }catch(err){
          btn.disabled=false;btn.textContent='Confirmo que cumpliré todos los requisitos';
          showGateError(err);
        }
      },{once:true});
      return;
    }
    if(result.canSave){
      action.innerHTML='<button id="saveVerifiedBtn" class="gold-button full-button" type="button">Guardar producto verificado</button>';
      $('saveVerifiedBtn')?.addEventListener('click',()=>approveAndSubmit(result),{once:true});
    }
  }catch(error){
    showGateError(error);
  }finally{
    if(submit){submit.disabled=false;submit.textContent=original||'Verificar oficialmente';}
  }
}

function showGateError(error){
  const panel=ensurePanel();
  panel.className='verification-result blocked';
  panel.innerHTML=`<div class="verification-head"><div><span class="verification-kicker">VERIFICACIÓN OFICIAL</span><h3>No se pudo verificar</h3></div></div><p class="verification-explanation">${esc(error?.message||String(error))}</p><div class="verification-blocked-note">Por seguridad, el producto no se guardará hasta completar la consulta oficial.</div>`;
}

const form=$('itemForm');
if(form){
  const submit=form.querySelector('button[type="submit"]');
  if(submit)submit.textContent='Verificar oficialmente antes de guardar';
  form.addEventListener('submit',handleGate,true);
  form.addEventListener('input',resetVerification);
  form.addEventListener('change',resetVerification);
  form.addEventListener('reset',()=>setTimeout(resetVerification,0));
  ensurePanel();
}

window.__ENTRYSAFE_VERIFICATION_GATE__={active:true,version:'1.1.0-local'};
