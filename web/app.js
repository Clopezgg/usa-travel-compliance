import { createClient } from './supabase-local.js';
import { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY } from './config.js';

function showBootstrapError(error){
  const message=error?.message||String(error||'Error desconocido');
  const toast=document.getElementById('toast');
  if(toast){
    toast.textContent=`No se pudo iniciar EntrySafe: ${message}`;
    toast.className='toast error';
  }
  console.error('[EntrySafe bootstrap]',error);
}

async function boot(){
  try{
    const response=await fetch('./runtime.js',{cache:'no-store'});
    if(!response.ok)throw new Error(`motor local HTTP ${response.status}`);
    let source=await response.text();
    if(!source.includes('handleAuthSubmit')||!source.includes('bindStaticEvents'))throw new Error('motor local incompleto');
    source=source
      .replace(/^import\s+\{\s*createClient\s*\}\s+from\s+['"][^'"]+['"];?\s*/m,'')
      .replace(/^import\s+\{\s*SUPABASE_URL\s*,\s*SUPABASE_PUBLISHABLE_KEY\s*\}\s+from\s+['"]\.\/config\.js['"];?\s*/m,'');
    globalThis.__ENTRYSAFE_LOCAL_CREATE_CLIENT__=createClient;
    globalThis.__ENTRYSAFE_LOCAL_CONFIG__={SUPABASE_URL,SUPABASE_PUBLISHABLE_KEY};
    const prefix=`const createClient=globalThis.__ENTRYSAFE_LOCAL_CREATE_CLIENT__;\nconst {SUPABASE_URL,SUPABASE_PUBLISHABLE_KEY}=globalThis.__ENTRYSAFE_LOCAL_CONFIG__;\n`;
    const blob=new Blob([prefix,source,'\n//# sourceURL=entrysafe-runtime-local.js'],{type:'text/javascript'});
    const blobUrl=URL.createObjectURL(blob);
    try{await import(blobUrl);}finally{URL.revokeObjectURL(blobUrl);delete globalThis.__ENTRYSAFE_LOCAL_CREATE_CLIENT__;delete globalThis.__ENTRYSAFE_LOCAL_CONFIG__;}
    window.__ENTRYSAFE_BOOT_OK__=true;
  }catch(error){
    window.__ENTRYSAFE_BOOT_OK__=false;
    showBootstrapError(error);
  }
}

boot();
