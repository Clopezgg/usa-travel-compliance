import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

type Obj=Record<string,any>;
type Item=Obj&{catalogKey:string;name:string;profileKey:string;answers?:Obj;declarationNameEn?:string;weightGrams?:number};
const VERSION="4.0.1-20260830";
const cors={"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"authorization, apikey, content-type, x-client-info","Access-Control-Allow-Methods":"POST, OPTIONS"};
const json=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:{...cors,"Content-Type":"application/json"}});

function resolveProfile(item:Item){
 if(item.profileKey!=="prepared_mixed")return item.profileKey||"unknown_review";
 const a=item.answers||{},ingredients=Array.isArray(a.ingredients)?a.ingredients:[];
 if(!ingredients.length)return "prepared_mixed";
 if(ingredients.includes("pork"))return "pork_processed";
 if(ingredients.includes("beef"))return "ruminant_meat";
 if(ingredients.includes("poultry"))return a.fullyCooked==="yes"?"poultry_cooked":"poultry_raw";
 if(ingredients.includes("seafood"))return "seafood";
 if(ingredients.includes("egg")||ingredients.includes("dairy"))return "baked_goods";
 if(ingredients.includes("vegetables"))return "dry_food";
 return "prepared_mixed";
}
function questions(item:Item,decision:string){
 if(!["review","restricted","conditional"].includes(decision))return [];
 const a=item.answers||{},out:Obj[]=[];
 if(item.profileKey==="prepared_mixed"){
   if(!Array.isArray(a.ingredients)||!a.ingredients.length)out.push({id:"ingredients",type:"multi",label:"¿Qué contiene?",options:[{value:"poultry",label:"Pollo / gallina / pavo"},{value:"pork",label:"Cerdo / chorizo / jamón"},{value:"beef",label:"Res / carne roja"},{value:"egg",label:"Huevo"},{value:"dairy",label:"Queso / crema / lácteos"},{value:"seafood",label:"Pescado / mariscos"},{value:"vegetables",label:"Solo vegetales / granos"}]});
   const ing=Array.isArray(a.ingredients)?a.ingredients:[];
   if(ing.some((x:string)=>["poultry","pork","beef"].includes(x))&&!a.fullyCooked)out.push({id:"fullyCooked",type:"single",label:"¿La carne está completamente cocida?",options:[{value:"yes",label:"Sí, completamente cocida"},{value:"no",label:"No / no estoy seguro"}]});
 }
 if(item.profileKey==="dairy"&&/quesillo|cuajada|reques[oó]n|crema|suero|yogur|leche/i.test(item.name)&&!a.packaging)out.push({id:"packaging",type:"single",label:"¿Cómo va?",options:[{value:"homemade",label:"Casero"},{value:"commercial_sealed",label:"Comercial y sellado"}]});
 if(item.profileKey==="unknown_review"&&!a.description)out.push({id:"description",type:"text",label:"Describe exactamente qué es y de qué está hecho"});
 return out;
}
function declared(result:Obj){return Boolean(result.declare||result.declarationRequired||result.decision==="allowed_declare");}

Deno.serve(async req=>{
 if(req.method==="OPTIONS")return new Response("ok",{headers:cors});
 if(req.method!=="POST")return json({ok:false,error:"Method not allowed"},405);
 try{
   const auth=req.headers.get("authorization")||"";if(!auth.toLowerCase().startsWith("bearer "))return json({ok:false,error:"Authentication required"},401);
   const token=auth.replace(/^Bearer\s+/i,"");
   const body=await req.json();const rawItems:Array<Item>=Array.isArray(body?.items)?body.items:[];
   if(!body?.tripId)return json({ok:false,error:"tripId is required"},400);
   if(rawItems.length>1000)return json({ok:false,error:"Maximum 1000 items per save"},400);
   const base=Deno.env.get("SUPABASE_URL")!,anon=Deno.env.get("SUPABASE_ANON_KEY")!;
   const client=createClient(base,anon,{global:{headers:{Authorization:auth}}});
   const userRes=await client.auth.getUser(token);const user=userRes.data.user;if(!user)return json({ok:false,error:"Session expired"},401);
   const tripCheck=await client.from("trips").select("id").eq("id",body.tripId).eq("user_id",user.id).maybeSingle();if(tripCheck.error||!tripCheck.data)return json({ok:false,error:"Trip not found for this user"},404);

   if(rawItems.length===0){
     const del=await client.from("trip_items").delete().eq("trip_id",body.tripId).eq("user_id",user.id);if(del.error)throw del.error;
     const snap=await client.from("trip_declaration_snapshots_v4").insert({trip_id:body.tripId,user_id:user.id,catalog_version:body.catalogVersion||"2026.08.30-v4",engine_version:VERSION,items:[],source_snapshot:[]});if(snap.error)console.warn("Empty declaration snapshot warning",snap.error.message);
     return json({ok:true,engineVersion:VERSION,summary:{total:0,ready:0,declare:0,attention:0,blocked:0},items:[],aggregateChecks:[],pendingQuestions:[],sources:[]});
   }

   const upstreamItems=rawItems.map(i=>({...i,profileKey:resolveProfile(i)}));
   const upstream=await fetch(`${base}/functions/v1/evaluate-trip-selection-v3`,{method:"POST",headers:{Authorization:auth,apikey:anon,"Content-Type":"application/json","x-client-info":"entrysafe-v4"},body:JSON.stringify({tripId:body.tripId,items:upstreamItems,catalogVersion:body.catalogVersion||"2026.08.30-v4",entryState:body.entryState||null})});
   const data=await upstream.json().catch(()=>({ok:false,error:`V3 engine returned ${upstream.status}`}));
   if(!upstream.ok||!data?.ok)return json({ok:false,error:data?.error||"Official-source engine failed",upstreamStatus:upstream.status},upstream.status>=400?upstream.status:500);

   const originalByKey=new Map(rawItems.map(i=>[i.catalogKey,i]));
   const sourceItems:Array<Obj>=Array.isArray(data.items)?data.items:[];
   const items=sourceItems.map((r,i)=>{
     const original=originalByKey.get(r.catalogKey)||rawItems[i]||{} as Item;const qs=questions(original,r.decision);
     return {...r,catalogKey:original.catalogKey,answers:original.answers||{},questions:qs,declarationNameEn:original.declarationNameEn||original.name,quantityDisplay:original.quantityDisplay||null,weightGrams:Number(original.weightGrams||0),admissibility:r.decision,declarationRequired:declared(r),airSecurity:{recommendedBag:r.recommendedBag||r.bag||"either",requirements:r.requirements||[]}};
   });

   const metadataUpdates=rawItems.map(async original=>client.from("trip_items").update({answers_v4:original.answers||{},item_weight_grams_v4:Number(original.weightGrams||0)||null,declaration_name_en_v4:original.declarationNameEn||null}).eq("trip_id",body.tripId).eq("user_id",user.id).eq("catalog_key_v3",original.catalogKey));
   const settled=await Promise.all(metadataUpdates);const failed=settled.find(x=>x.error);if(failed?.error)console.warn("EntrySafe V4 metadata update warning",failed.error.message);

   const summary={total:items.length,ready:items.filter(i=>["allowed","allowed_declare"].includes(i.decision)).length,declare:items.filter(declared).length,attention:items.filter(i=>["review","restricted","conditional"].includes(i.decision)).length,blocked:items.filter(i=>i.decision==="prohibited").length};
   const declarationItems=items.filter(declared).map(i=>({catalogKey:i.catalogKey,nameEs:i.name,nameEn:i.declarationNameEn,quantity:i.quantityDisplay,decision:i.decision,requirements:i.requirements||[],sources:i.sources||[]}));
   const declarationSourceMap=new Map<string,Obj>(),allSourceMap=new Map<string,Obj>();
   for(const i of items)for(const s of i.sources||[])if(s?.url)allSourceMap.set(s.url,s);
   for(const i of declarationItems)for(const s of i.sources||[])if(s?.url)declarationSourceMap.set(s.url,s);
   const snap=await client.from("trip_declaration_snapshots_v4").insert({trip_id:body.tripId,user_id:user.id,catalog_version:body.catalogVersion||"2026.08.30-v4",engine_version:VERSION,items:declarationItems,source_snapshot:[...declarationSourceMap.values()]});if(snap.error)console.warn("EntrySafe V4 declaration snapshot warning",snap.error.message);

   return json({ok:true,engineVersion:VERSION,officialEngineVersion:data.engineVersion||data.version||"v3",summary,items,aggregateChecks:data.aggregateChecks||[],pendingQuestions:items.flatMap(i=>(i.questions||[]).map((q:Obj)=>({catalogKey:i.catalogKey,name:i.name,question:q}))),sources:[...allSourceMap.values()]});
 }catch(error){console.error(error);return json({ok:false,error:error instanceof Error?error.message:"Unexpected evaluation error"},500);}
});
