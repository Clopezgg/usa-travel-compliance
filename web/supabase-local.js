const SESSION_KEY='entrysafe-supabase-session-v1';

function apiError(payload,status){
  const message=payload?.msg||payload?.message||payload?.error_description||payload?.error||`Error HTTP ${status}`;
  const error=new Error(String(message));
  error.status=status;
  error.payload=payload;
  return error;
}
function parseJsonSafe(text){try{return text?JSON.parse(text):null;}catch{return text||null;}}
function normalizeSession(raw){
  if(!raw?.access_token)return null;
  const expiresIn=Number(raw.expires_in||3600);
  return {...raw,expires_at:Number(raw.expires_at||Math.floor(Date.now()/1000)+expiresIn)};
}
function readStored(){try{return normalizeSession(JSON.parse(localStorage.getItem(SESSION_KEY)||'null'));}catch{return null;}}
function writeStored(session){try{if(session)localStorage.setItem(SESSION_KEY,JSON.stringify(session));else localStorage.removeItem(SESSION_KEY);}catch{}}

class PostgrestBuilder{
  constructor(client,table){this.client=client;this.table=table;this.operation='select';this.columns='*';this.filters=[];this.orders=[];this.payload=null;this.countMode=null;this.returning=false;this.singleMode=null;}
  select(columns='*',options={}){this.columns=columns||'*';this.countMode=options?.count||this.countMode;if(this.operation!=='select')this.returning=true;return this;}
  insert(payload){this.operation='insert';this.payload=payload;return this;}
  update(payload){this.operation='update';this.payload=payload;return this;}
  delete(){this.operation='delete';return this;}
  eq(column,value){this.filters.push([column,'eq',value]);return this;}
  order(column,{ascending=true}={}){this.orders.push(`${column}.${ascending?'asc':'desc'}`);return this;}
  single(){this.singleMode='single';return this.execute();}
  maybeSingle(){this.singleMode='maybe';return this.execute();}
  then(resolve,reject){return this.execute().then(resolve,reject);}
  async execute(){
    try{
      const session=await this.client._getActiveSession();
      const url=new URL(`${this.client.url}/rest/v1/${encodeURIComponent(this.table)}`);
      if(this.columns)url.searchParams.set('select',this.columns);
      for(const [column,op,value] of this.filters)url.searchParams.append(column,`${op}.${value}`);
      if(this.orders.length)url.searchParams.set('order',this.orders.join(','));
      const headers=this.client._headers(session);
      headers.Accept='application/json';
      let method='GET',body;
      const prefer=[];
      if(this.countMode==='exact')prefer.push('count=exact');
      if(this.operation==='insert'){method='POST';body=JSON.stringify(this.payload);headers['Content-Type']='application/json';prefer.push(this.returning?'return=representation':'return=minimal');}
      if(this.operation==='update'){method='PATCH';body=JSON.stringify(this.payload);headers['Content-Type']='application/json';prefer.push(this.returning?'return=representation':'return=minimal');}
      if(this.operation==='delete'){method='DELETE';prefer.push(this.returning?'return=representation':'return=minimal');}
      if(prefer.length)headers.Prefer=prefer.join(',');
      const response=await fetch(url,{method,headers,body,cache:'no-store'});
      const text=await response.text();
      const parsed=parseJsonSafe(text);
      if(!response.ok)return{data:null,error:apiError(parsed,response.status),count:null,status:response.status};
      let data=parsed;
      if(response.status===204||text==='')data=this.operation==='select'?[]:null;
      if(this.singleMode){
        const list=Array.isArray(data)?data:(data==null?[]:[data]);
        if(this.singleMode==='single'&&list.length!==1)return{data:null,error:new Error(list.length?'Se recibió más de un registro.':'No se encontró el registro.'),count:null,status:response.status};
        data=list[0]||null;
      }
      let count=null;
      const range=response.headers.get('content-range');
      if(range&&range.includes('/')){const total=range.split('/').pop();if(total&&total!=='*')count=Number(total);}
      return{data,error:null,count,status:response.status};
    }catch(error){return{data:null,error,count:null,status:0};}
  }
}

export function createClient(url,key,options={}){
  const listeners=new Set();
  const client={url:url.replace(/\/$/,''),key,options,_session:readStored()};
  client._headers=session=>{const headers={apikey:key};if(session?.access_token)headers.Authorization=`Bearer ${session.access_token}`;return headers;};
  client._emit=(event,session)=>{for(const cb of listeners){try{cb(event,session);}catch(error){console.error(error);}}};
  client._save=session=>{client._session=normalizeSession(session);writeStored(client._session);return client._session;};
  client._user=async session=>{
    if(!session?.access_token)return null;
    const response=await fetch(`${client.url}/auth/v1/user`,{headers:client._headers(session),cache:'no-store'});
    const text=await response.text();const payload=parseJsonSafe(text);
    if(!response.ok)throw apiError(payload,response.status);
    return payload;
  };
  client._refresh=async session=>{
    if(!session?.refresh_token)return null;
    const response=await fetch(`${client.url}/auth/v1/token?grant_type=refresh_token`,{method:'POST',headers:{apikey:key,'Content-Type':'application/json'},body:JSON.stringify({refresh_token:session.refresh_token}),cache:'no-store'});
    const text=await response.text();const payload=parseJsonSafe(text);
    if(!response.ok){client._save(null);return null;}
    const next=client._save({...payload,user:payload.user||session.user});client._emit('TOKEN_REFRESHED',next);return next;
  };
  client._consumeRedirect=async()=>{
    const hash=new URLSearchParams(location.hash.replace(/^#/,''));
    if(!hash.get('access_token'))return null;
    const session=normalizeSession({access_token:hash.get('access_token'),refresh_token:hash.get('refresh_token'),expires_in:Number(hash.get('expires_in')||3600),expires_at:Number(hash.get('expires_at')||0),token_type:hash.get('token_type')||'bearer'});
    try{session.user=await client._user(session);}catch{}
    client._save(session);
    history.replaceState({},document.title,location.pathname+location.search);
    client._emit('SIGNED_IN',session);
    return session;
  };
  client._getActiveSession=async()=>{
    if(!client._session)await client._consumeRedirect();
    let session=client._session||readStored();
    if(!session)return null;
    const now=Math.floor(Date.now()/1000);
    if(Number(session.expires_at||0)<=now+60)session=await client._refresh(session);
    client._session=session;
    return session;
  };

  client.auth={
    async getSession(){const session=await client._getActiveSession();return{data:{session},error:null};},
    async signInWithPassword({email,password}){
      try{
        const response=await fetch(`${client.url}/auth/v1/token?grant_type=password`,{method:'POST',headers:{apikey:key,'Content-Type':'application/json'},body:JSON.stringify({email,password}),cache:'no-store'});
        const text=await response.text();const payload=parseJsonSafe(text);
        if(!response.ok)return{data:{session:null,user:null},error:apiError(payload,response.status)};
        const session=client._save(payload);client._emit('SIGNED_IN',session);return{data:{session,user:session.user},error:null};
      }catch(error){return{data:{session:null,user:null},error};}
    },
    async signUp({email,password,options:signupOptions={}}){
      try{
        const redirect=signupOptions.emailRedirectTo?`?redirect_to=${encodeURIComponent(signupOptions.emailRedirectTo)}`:'';
        const response=await fetch(`${client.url}/auth/v1/signup${redirect}`,{method:'POST',headers:{apikey:key,'Content-Type':'application/json'},body:JSON.stringify({email,password,data:signupOptions.data||{}}),cache:'no-store'});
        const text=await response.text();const payload=parseJsonSafe(text);
        if(!response.ok)return{data:{session:null,user:null},error:apiError(payload,response.status)};
        const session=payload?.access_token?client._save(payload):null;if(session)client._emit('SIGNED_IN',session);return{data:{session,user:payload?.user||session?.user||payload},error:null};
      }catch(error){return{data:{session:null,user:null},error};}
    },
    async resetPasswordForEmail(email,{redirectTo}={}){
      try{
        const redirect=redirectTo?`?redirect_to=${encodeURIComponent(redirectTo)}`:'';
        const response=await fetch(`${client.url}/auth/v1/recover${redirect}`,{method:'POST',headers:{apikey:key,'Content-Type':'application/json'},body:JSON.stringify({email}),cache:'no-store'});
        const text=await response.text();const payload=parseJsonSafe(text);
        return response.ok?{data:payload,error:null}:{data:null,error:apiError(payload,response.status)};
      }catch(error){return{data:null,error};}
    },
    async signOut(){
      const session=await client._getActiveSession();
      try{if(session?.access_token)await fetch(`${client.url}/auth/v1/logout`,{method:'POST',headers:client._headers(session),cache:'no-store'});}catch{}
      client._save(null);client._emit('SIGNED_OUT',null);return{error:null};
    },
    onAuthStateChange(callback){listeners.add(callback);return{data:{subscription:{unsubscribe:()=>listeners.delete(callback)}}};}
  };

  client.from=table=>new PostgrestBuilder(client,table);
  client.storage={from:bucket=>({
    async upload(path,file,{upsert=false}={}){
      try{
        const session=await client._getActiveSession();if(!session)throw new Error('Sesión requerida.');
        const encoded=String(path).split('/').map(encodeURIComponent).join('/');
        const headers=client._headers(session);headers['x-upsert']=String(!!upsert);if(file?.type)headers['Content-Type']=file.type;
        const response=await fetch(`${client.url}/storage/v1/object/${encodeURIComponent(bucket)}/${encoded}`,{method:'POST',headers,body:file});
        const text=await response.text();const payload=parseJsonSafe(text);
        return response.ok?{data:payload,error:null}:{data:null,error:apiError(payload,response.status)};
      }catch(error){return{data:null,error};}
    }
  })};
  client.functions={
    async invoke(name,{body}={}){
      try{
        const session=await client._getActiveSession();if(!session)throw new Error('Sesión requerida.');
        const response=await fetch(`${client.url}/functions/v1/${encodeURIComponent(name)}`,{method:'POST',headers:{...client._headers(session),'Content-Type':'application/json'},body:JSON.stringify(body??{}),cache:'no-store'});
        const text=await response.text();const payload=parseJsonSafe(text);
        return response.ok?{data:payload,error:null}:{data:payload,error:apiError(payload,response.status)};
      }catch(error){return{data:null,error};}
    }
  };
  return client;
}
