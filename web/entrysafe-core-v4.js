export const MASS_TO_G={mg:.001,g:1,kg:1000,oz:28.349523125,lb:453.59237};
export const VOLUME_TO_ML={ml:1,cl:10,L:1000,fl_oz:29.5735295625,cup:236.5882365,pint:473.176473,quart:946.352946,gallon:3785.411784};
export const UNIT_LABEL={unit:'unidad',package:'paquete',bag:'bolsa',bottle:'botella',can:'lata',box:'caja',pair:'par',dozen:'docena',tablet:'tableta',capsule:'cápsula',dose:'dosis',day:'día',mg:'mg',g:'g',kg:'kg',oz:'oz',lb:'lb',ml:'ml',cl:'cl',L:'L',fl_oz:'fl oz',cup:'taza',pint:'pinta',quart:'cuarto',gallon:'galón',USD:'USD',Wh:'Wh',mAh:'mAh',Ah:'Ah',V:'V',cm:'cm',inch:'pulgadas'};

export const normalizeText=(value='')=>String(value).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
export const slug=(value='')=>normalizeText(value).replace(/\s+/g,'-');
export const stableKey=item=>`${slug(item.section)}--${slug(item.name_es)}--${slug(item.profile)}`;
export const round=(n,d=3)=>Math.round((Number(n)||0)*10**d)/10**d;

export function toGrams(value,unit){const f=MASS_TO_G[unit];return f==null?null:(Number(value)||0)*f;}
export function fromGrams(value,unit){const f=MASS_TO_G[unit];return f==null?null:(Number(value)||0)/f;}
export function toMl(value,unit){const f=VOLUME_TO_ML[unit];return f==null?null:(Number(value)||0)*f;}
export function fromMl(value,unit){const f=VOLUME_TO_ML[unit];return f==null?null:(Number(value)||0)/f;}
export function presentationTotalMl(presentations=[]){return presentations.reduce((sum,p)=>sum+(toMl(Number(p.size||0),p.unit)||0)*Number(p.count||0),0);}
export function presentationLabel(presentations=[]){return presentations.filter(p=>Number(p.count)>0&&Number(p.size)>0).map(p=>`${Number(p.count)} × ${trimNumber(p.size)} ${UNIT_LABEL[p.unit]||p.unit}`).join(' + ');}
export function trimNumber(n){const v=Number(n||0);return Number.isInteger(v)?String(v):String(round(v,2));}
export function formatQuantity(draft){
 if(Array.isArray(draft?.presentations)&&draft.presentations.length){const ml=presentationTotalMl(draft.presentations);return `${presentationLabel(draft.presentations)} · total ${formatBestVolume(ml)}`;}
 if(draft?.measurementKind==='days'||draft?.quantityUnit==='day')return `${trimNumber(draft.daysSupply||draft.quantityValue)} días`;
 if(draft?.measurementKind==='money'||draft?.quantityUnit==='USD')return `$${Number(draft.quantityValue||0).toLocaleString('en-US',{maximumFractionDigits:2})} USD`;
 return `${trimNumber(draft?.quantityValue||0)} ${UNIT_LABEL[draft?.quantityUnit]||draft?.quantityUnit||'unidad'}`;
}
export function formatBestVolume(ml){return ml>=1000?`${round(ml/1000,3)} L`:`${round(ml,1)} ml`;}
export function formatBestMass(g){return g>=1000?`${round(g/1000,3)} kg`:`${round(g,1)} g`;}
export function itemKnownWeightGrams(draft){
 if(Number(draft?.weightGrams)>0)return Number(draft.weightGrams);
 if(draft?.measurementKind==='mass')return toGrams(draft.quantityValue,draft.quantityUnit)||0;
 return 0;
}
export function wattHours({batteryWh,batteryMah,batteryVoltage}){if(Number(batteryWh)>0)return Number(batteryWh);if(Number(batteryMah)>0&&Number(batteryVoltage)>0)return round(Number(batteryMah)/1000*Number(batteryVoltage),2);return 0;}

export const READY_DECISIONS=new Set(['allowed','allowed_declare']);
export const DECLARE_DECISIONS=new Set(['allowed_declare']);
export function decisionLabel(v){return ({allowed:'Puedes llevar',allowed_declare:'Puedes llevar · declarar',restricted:'Permitido con condiciones',conditional:'Permitido con condiciones',review:'Necesito un dato más',prohibited:'No llevar'})[v]||'Pendiente';}
export function decisionTone(v){return v==='prohibited'?'danger':v==='review'||v==='restricted'||v==='conditional'?'attention':v==='allowed_declare'?'declare':'ready';}
export function operationalSummary(items=[]){
 const total=items.length;
 const ready=items.filter(i=>READY_DECISIONS.has(i.computed_decision||i.decision)).length;
 const declare=items.filter(i=>Boolean(i.evaluation_v3?.declare??i.declare??(i.computed_decision==='allowed_declare'))).length;
 const pending=items.filter(i=>['review','restricted','conditional'].includes(i.computed_decision||i.decision)).length;
 const blocked=items.filter(i=>(i.computed_decision||i.decision)==='prohibited').length;
 return {total,ready,declare,pending,blocked,prepared:total>0&&pending===0&&blocked===0};
}

const MIXED_INGREDIENTS=[
 {value:'poultry',label:'Pollo / gallina / pavo'},
 {value:'pork',label:'Cerdo / chorizo / jamón'},
 {value:'beef',label:'Res / carne roja'},
 {value:'egg',label:'Huevo'},
 {value:'dairy',label:'Queso / crema / lácteos'},
 {value:'seafood',label:'Pescado / mariscos'},
 {value:'vegetables',label:'Solo vegetales / granos'}
];
const DAIRY_NEEDS_KIND=/quesillo|cuajada|requeson|crema|suero|yogur|leche liquida/i;
export function microQuestions(item,answers={}){
 const questions=[];
 if(item?.profile==='prepared_mixed'){
   questions.push({id:'ingredients',type:'multi',label:'¿Qué contiene?',options:MIXED_INGREDIENTS,required:true});
   const ing=Array.isArray(answers.ingredients)?answers.ingredients:[];
   if(ing.some(x=>['poultry','pork','beef'].includes(x)))questions.push({id:'fullyCooked',type:'single',label:'¿La carne está completamente cocida?',options:[{value:'yes',label:'Sí, completamente cocida'},{value:'no',label:'No / no estoy seguro'}],required:true});
 }
 if(item?.profile==='dairy'&&DAIRY_NEEDS_KIND.test(normalizeText(item.name_es)))questions.push({id:'packaging',type:'single',label:'¿Cómo va?',options:[{value:'homemade',label:'Casero'},{value:'commercial_sealed',label:'Comercial y sellado'}],required:true});
 if(item?.profile==='unknown_review')questions.push({id:'description',type:'text',label:'Describe exactamente qué es y de qué está hecho',required:true});
 return questions;
}
export function unansweredQuestions(item,answers={}){return microQuestions(item,answers).filter(q=>q.required&&(q.type==='multi'?!Array.isArray(answers[q.id])||answers[q.id].length===0:!String(answers[q.id]??'').trim()));}
export function resolveProfile(item,answers={}){
 if(item?.profile!=='prepared_mixed')return item?.profile||'unknown_review';
 const ing=Array.isArray(answers.ingredients)?answers.ingredients:[];
 if(!ing.length)return 'prepared_mixed';
 if(ing.includes('pork'))return 'pork_processed';
 if(ing.includes('beef'))return 'ruminant_meat';
 if(ing.includes('poultry'))return answers.fullyCooked==='yes'?'poultry_cooked':'poultry_raw';
 if(ing.includes('seafood'))return 'seafood';
 if(ing.includes('egg')||ing.includes('dairy'))return 'baked_goods';
 if(ing.includes('vegetables'))return 'dry_food';
 return 'prepared_mixed';
}

const EN_EXACT=new Map(Object.entries({
 'Café tostado o molido':'Roasted or ground coffee','Café verde':'Green coffee beans','Cereza fresca de café':'Fresh coffee cherries','Tortillas de harina':'Flour tortillas','Tortillas de maíz':'Corn tortillas','Rosquillas':'Honduran rosquillas','Quesadillas hondureñas':'Honduran sweet cheese bread','Semitas':'Honduran semitas','Pan dulce':'Sweet bread','Pan de coco':'Coconut bread','Tabletas de coco':'Coconut candy','Churros / churritos':'Packaged corn snacks','Zambos':'Plantain chips','Platanitos':'Plantain chips','Baleadas':'Honduran baleadas','Nacatamales':'Honduran nacatamales','Tamales':'Tamales','Montucas':'Honduran corn tamales','Arroz chino preparado':'Prepared fried rice','Chop suey preparado':'Prepared chop suey','Gifiti / guifiti':'Guifiti alcoholic beverage','Achiote seco':'Dried annatto','Consomé en polvo':'Powdered seasoning','Quesillo':'Fresh string cheese','Cuajada':'Fresh curd cheese','Requesón':'Fresh ricotta-style cheese','Mantequilla':'Butter','Pollo completamente cocido':'Fully cooked chicken','Gallina completamente cocido':'Fully cooked hen','Gallo completamente cocido':'Fully cooked rooster','Aguardiente / guaro 40%':'40% distilled spirits','Ron 40%':'40% rum','Pescado frito':'Fried fish','Café hondureño':'Honduran coffee','Power bank':'Portable power bank','Perfume':'Perfume'}));
export function englishName(item){
 if(!item)return 'Travel item';
 if(item.name_en&&item.name_en!==item.name_es)return item.name_en;
 if(EN_EXACT.has(item.name_es))return EN_EXACT.get(item.name_es);
 let s=item.name_es;
 const replacements=[[/ completamente cocido/gi,' fully cooked'],[/ crudo o refrigerado/gi,' raw or refrigerated'],[/ congelado/gi,' frozen'],[/ fresco/gi,' fresh'],[/ deshidratado/gi,' dried'],[/ comercialmente enlatado/gi,' commercially canned'],[/ comercial cocido, sellado y estable/gi,' commercially cooked, sealed and shelf-stable'],[/Pollo/gi,'Chicken'],[/Gallina/gi,'Hen'],[/Gallo/gi,'Rooster'],[/Pavo/gi,'Turkey'],[/Cerdo/gi,'Pork'],[/Carne de res/gi,'Beef'],[/Queso/gi,'Cheese'],[/Café/gi,'Coffee'],[/Mango/gi,'Mango'],[/Aguacate/gi,'Avocado'],[/Fruta/gi,'Fruit'],[/Verdura/gi,'Vegetable'],[/Semillas/gi,'Seeds'],[/Tierra/gi,'Soil']];
 for(const [a,b] of replacements)s=s.replace(a,b);
 return s;
}

export function draftSnapshot(d){return JSON.stringify({key:d.catalogKey||stableKey(d.item),quantityValue:Number(d.quantityValue||0),quantityUnit:d.quantityUnit||'',presentations:(d.presentations||[]).map(p=>({count:Number(p.count||0),size:Number(p.size||0),unit:p.unit||''})),abvPercent:Number(d.abvPercent||0),batteryWh:Number(d.batteryWh||0),batteryMah:Number(d.batteryMah||0),batteryVoltage:Number(d.batteryVoltage||0),daysSupply:Number(d.daysSupply||0),weightGrams:Number(d.weightGrams||0),answers:d.answers||{}});}
export function selectionFingerprint(drafts){return [...drafts].map(draftSnapshot).sort().join('|');}
