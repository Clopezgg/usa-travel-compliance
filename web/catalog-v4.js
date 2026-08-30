import { CATALOG as BASE_CATALOG, UNIT_OPTIONS as BASE_UNIT_OPTIONS } from './catalog-v3.js';
import { normalizeText,stableKey } from './entrysafe-core-v4.js';

export const CATALOG_VERSION='2026.08.30-v4';
export const UNIT_OPTIONS={...BASE_UNIT_OPTIONS,count:[...new Set([...(BASE_UNIT_OPTIONS.count||[]),'bag','dozen','tablet','capsule','dose'])],mass:[...new Set([...(BASE_UNIT_OPTIONS.mass||[]),'mg'])],volume:[...new Set([...(BASE_UNIT_OPTIONS.volume||[]),'cl'])]};

const CUSTOM_ITEM={slug:'otro-articulo-v4',name_es:'Otro artículo',name_en:'Other item',section:'Otros',family:'unknown',profile:'unknown_review',measurement_kind:'count',default_unit:'unit',aliases:['otro','otra cosa','articulo no listado','producto no listado'],common_hn:false,icon_key:'box',sort_weight:999};
export const CATALOG=[...BASE_CATALOG,CUSTOM_ITEM];

const EXTRA_ALIASES={
 'Churros / churritos':['churrus','churros hondureños','churros de bolsa','churro de bolsa'],
 'Tabletas de coco':['tableta de coco hondureña','dulce de coco hondureño'],
 'Quesillo':['quesillo hondureño','queso quesillo','queso fresco de honduras'],
 'Cuajada':['cuajada hondureña','queso cuajada'],
 'Requesón':['requeson hondureño','ricotta hondureña'],
 'Gifiti / guifiti':['guaro garifuna','bebida guifiti','bebida gifiti'],
 'Aguardiente / guaro 40%':['guaro','aguardiente hondureño','licor 40'],
 'Pollo completamente cocido':['pollo frito','pollo asado','pollo horneado','carne de pollo cocida'],
 'Gallina completamente cocido':['gallina asada','gallina frita','gallina cocida'],
 'Gallo completamente cocido':['gallo asado','gallo cocido'],
 'Arroz chino preparado':['arroz chino','arroz frito chino'],
 'Chop suey preparado':['chapsuy','chapsui','chop suey'],
 'Café tostado o molido':['cafe hondureño','café hondureño','cafe molido de honduras'],
 'Tortillas de harina':['tortilla de harina hondureña','tortillas harina'],
 'Quesadillas hondureñas':['quesadilla hondureña','quesadilla de pan'],
 'Power bank':['bateria portatil','batería portátil','cargador portatil']
};

function variantsFor(item){
 const raw=new Set([item.name_es,item.name_en,...(item.aliases||[]),...(EXTRA_ALIASES[item.name_es]||[])]);
 const base=[...raw].filter(Boolean);
 for(const a of base){
   const n=normalizeText(a);raw.add(n);raw.add(`llevo ${n}`);raw.add(`${n} honduras`);
   if(n.endsWith('s'))raw.add(n.slice(0,-1));else raw.add(`${n}s`);
   raw.add(n.replace(/ completamente /g,' '));
   raw.add(n.replace(/ comercialmente /g,' ').replace(/ comercial /g,' '));
 }
 return [...raw].map(normalizeText).filter(Boolean);
}

export const ALIASES_BY_KEY=new Map();
export const ALIAS_INDEX=[];
for(const item of CATALOG){const key=stableKey(item),aliases=[...new Set(variantsFor(item))];ALIASES_BY_KEY.set(key,aliases);for(const alias of aliases)ALIAS_INDEX.push({alias,key,item});}
export const ALIAS_COUNT=ALIAS_INDEX.length;

export const TRAVEL_GROUPS=[
 {id:'frequent',label:'Frecuentes',sections:['Honduras y frecuentes']},
 {id:'food',label:'Comida',sections:['Carnes y aves','Lácteos y huevos','Pescados y mariscos','Frutas','Verduras y raíces','Granos y despensa','Panes y comidas preparadas','Snacks y dulces','Condimentos y despensa']},
 {id:'drinks',label:'Bebidas',sections:['Bebidas','Alcohol']},
 {id:'personal',label:'Personal',sections:['Ropa y accesorios','Cuidado personal','Medicamentos y salud','Bebés','Nutrición']},
 {id:'tech',label:'Tecnología',sections:['Electrónicos']},
 {id:'special',label:'Especiales',sections:['Plantas y semillas','Regalos y recuerdos','Tabaco','Mascotas','Equipaje y artículos de viaje','Documentos y dinero','Otros']}
];
export const SECTIONS=[...new Set(CATALOG.map(i=>i.section))];
export function groupForSection(section){return TRAVEL_GROUPS.find(g=>g.sections.includes(section))?.id||'special';}

function scoreItem(item,q){
 const key=stableKey(item),aliases=ALIASES_BY_KEY.get(key)||[];let score=0;
 for(const a of aliases){if(a===q)score=Math.max(score,100);else if(a.startsWith(q))score=Math.max(score,80);else if(a.includes(q))score=Math.max(score,55);else if(q.split(' ').every(p=>a.includes(p)))score=Math.max(score,40);}
 if(item.common_hn)score+=8;if(item.section==='Honduras y frecuentes')score+=6;return score;
}
export function searchCatalogV4(query='',group='frequent',section='all'){
 const q=normalizeText(query);let rows=CATALOG;
 if(section!=='all')rows=rows.filter(i=>i.section===section);else if(group&&group!=='all'){const g=TRAVEL_GROUPS.find(x=>x.id===group);if(g)rows=rows.filter(i=>g.sections.includes(i.section));}
 if(q)rows=rows.map(item=>({item,score:scoreItem(item,q)})).filter(x=>x.score>0).sort((a,b)=>b.score-a.score||a.item.name_es.localeCompare(b.item.name_es,'es')).map(x=>x.item);
 else rows=[...rows].sort((a,b)=>(a.sort_weight||100)-(b.sort_weight||100)||Number(b.common_hn)-Number(a.common_hn)||a.name_es.localeCompare(b.name_es,'es'));
 return rows;
}

export const AIRPORT_NAMES={FLL:'Fort Lauderdale',MIA:'Miami',MCO:'Orlando',TPA:'Tampa',JFK:'New York',EWR:'Newark',LGA:'New York',IAH:'Houston',DFW:'Dallas–Fort Worth',ATL:'Atlanta',LAX:'Los Angeles',ORD:'Chicago',BOS:'Boston',IAD:'Washington, D.C.',DCA:'Washington, D.C.',CLT:'Charlotte',MSY:'New Orleans'};
export const COMMON_DOCUMENTS=[
 {type:'passport',label:'Pasaporte',required:true},
 {type:'visa',label:'Visa estadounidense',required:true},
 {type:'ticket',label:'Boleto aéreo',required:true},
 {type:'hotel',label:'Reserva / dirección de estadía',required:false},
 {type:'insurance',label:'Seguro de viaje',required:false},
 {type:'prescription',label:'Receta / carta médica',required:false},
 {type:'i94',label:'I-94',required:false}
];

export function catalogStats(){return {products:CATALOG.length,aliases:ALIAS_COUNT,sections:SECTIONS.length,groups:TRAVEL_GROUPS.length};}
