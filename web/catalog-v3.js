export const CATALOG_VERSION='2026.08.30-v3';
const C=[];let seq=0;
const slug=s=>s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
const add=(name,section,family,profile,measurement='count',unit='unit',aliases=[],common=false,icon='box',sort=100)=>C.push({slug:`${slug(name)}-${++seq}`,name_es:name,name_en:name,section,family,profile,measurement_kind:measurement,default_unit:unit,aliases,common_hn:common,icon_key:icon,sort_weight:sort});
const many=(names,section,family,profile,measurement='count',unit='unit',icon='box',common=false)=>names.forEach(n=>add(n,section,family,profile,measurement,unit,[],common,icon));
const variants=(bases,section,family,defs,commonNames=[])=>bases.forEach(base=>defs.forEach(d=>add(`${base} ${d.label}`,section,family,d.profile,d.measurement||'mass',d.unit||'lb',d.alias?d.alias(base):[],commonNames.includes(base)&&d.common!==false,d.icon||'box')));

[
['Café tostado o molido','coffee_roasted','mass','lb',['cafe','café molido','cafe hondureño','cafe tostado'],'coffee'],['Café verde','coffee_green','mass','lb',['green coffee','cafe sin tostar'],'coffee'],['Cereza fresca de café','coffee_cherry','mass','lb',['coffee cherry'],'coffee'],['Tortillas de harina','baked_goods','count','unit',['tortilla harina','tortillas harina'],'bread'],['Tortillas de maíz','baked_goods','count','unit',['tortilla maiz','tortillas maiz'],'bread'],['Rosquillas','baked_goods','count','package',['rosquilla hondureña'],'snack'],['Quesadillas hondureñas','baked_goods','count','unit',['quesadilla hondureña'],'bread'],['Semitas','baked_goods','count','unit',['semita'],'bread'],['Pan dulce','baked_goods','count','unit',['pan de pulperia'],'bread'],['Pan de coco','baked_goods','count','unit',[],'bread'],['Tabletas de coco','dry_food','count','unit',['dulce de coco','tableta coco'],'snack'],['Churros / churritos','dry_food','count','package',['churros','churritos','churrus'],'snack'],['Zambos','dry_food','count','package',['zambos chips'],'snack'],['Platanitos','dry_food','count','package',['tajadas empacadas'],'snack'],['Baleadas','prepared_mixed','count','unit',['baleada'],'food'],['Nacatamales','prepared_mixed','count','unit',['nacatamal'],'food'],['Tamales','prepared_mixed','count','unit',['tamal'],'food'],['Montucas','prepared_mixed','count','unit',['montuca'],'food'],['Arroz chino preparado','prepared_mixed','mass','lb',['arroz chino'],'food'],['Chop suey preparado','prepared_mixed','mass','lb',['chapsuy','chop suey'],'food'],['Gifiti / guifiti','alcohol_24_70','volume','L',['gifiti','guifiti'],'bottle'],['Achiote seco','spices_dried','mass','oz',['achiote'],'spice'],['Consomé en polvo','spices_dried','mass','oz',['consome','sazonador'],'spice']
].forEach(x=>add(x[0],'Honduras y frecuentes','honduras_common',x[1],x[2],x[3],x[4],true,x[5],10));

['Pollo','Gallina','Gallo','Pavo','Pato','Codorniz'].forEach(p=>{
 add(`${p} completamente cocido`,'Carnes y aves','poultry','poultry_cooked','mass','lb',[`${p.toLowerCase()} frito`,`${p.toLowerCase()} asado`,`${p.toLowerCase()} horneado`,`carne de ${p.toLowerCase()} cocida`],['Pollo','Gallina'].includes(p),'meat');
 add(`${p} crudo o refrigerado`,'Carnes y aves','poultry','poultry_raw','mass','lb',[`${p.toLowerCase()} crudo`,`${p.toLowerCase()} fresco`],false,'meat');
 add(`${p} congelado`,'Carnes y aves','poultry','poultry_raw','mass','lb',[],false,'meat');
 add(`${p} comercial cocido, sellado y estable`,'Carnes y aves','poultry','poultry_shelf_stable','mass','lb',[],false,'meat');
});
many(['Carne de cerdo','Chuleta de cerdo','Costilla de cerdo','Lomo de cerdo'],'Carnes y aves','pork','pork_general','mass','lb','meat');
many(['Chorizo','Jamón','Tocino','Chicharrón','Salchicha de cerdo','Mortadela con cerdo','Salami','Prosciutto'],'Carnes y aves','pork','pork_processed','mass','lb','meat');
many(['Carne de res','Bistec de res','Carne molida de res','Costilla de res','Carne seca de res','Cecina de res','Embutido de res','Salchicha de res','Carne de ternera','Carne de cabra','Carne de oveja','Carne de cordero'],'Carnes y aves','ruminant_meat','ruminant_meat','mass','lb','meat');

many(['Queso sólido','Quesillo','Cuajada','Requesón','Queso fresco','Queso seco','Queso crema','Mozzarella','Cheddar','Parmesano','Queso rallado','Mantequilla','Crema','Leche líquida','Yogur','Helado','Suero'],'Lácteos y huevos','dairy','dairy','mass','lb','dairy');
many(['Leche en polvo','Leche condensada','Leche evaporada','Dulce de leche'],'Lácteos y huevos','dairy','dairy_processed','mass','lb','dairy');
many(['Huevos frescos de gallina','Huevos frescos de codorniz','Huevos cocidos','Huevos en polvo','Claras de huevo','Yemas de huevo','Mayonesa comercial'],'Lácteos y huevos','egg','egg_product','count','unit','egg');

many(['Pescado frito','Pescado asado','Pescado seco','Pescado salado','Pescado congelado','Tilapia','Salmón','Atún enlatado','Sardinas enlatadas','Camarones cocidos','Camarones congelados','Langosta','Cangrejo','Pulpo','Calamar','Caracol de mar','Ostras','Almejas','Mejillones','Ceviche'],'Pescados y mariscos','seafood','seafood','mass','lb','fish');
many(['Mariscos empanizados'],'Pescados y mariscos','seafood','seafood_breaded','mass','lb','fish');

const fruits=['Aguacate','Mango','Banano','Plátano','Piña','Papaya','Naranja','Mandarina','Limón','Toronja','Sandía','Melón','Manzana','Pera','Uvas','Fresas','Mora','Frambuesa','Arándano','Guayaba','Maracuyá','Tamarindo','Rambután','Lichi','Coco','Granada','Durazno','Ciruela','Cereza','Kiwi','Higo','Mamey','Guanábana','Anona','Zapote'];
variants(fruits,'Frutas','fruit',[{label:'fresco',profile:'fruit_fresh',common:true,icon:'fruit',alias:b=>[b.toLowerCase()]},{label:'congelado',profile:'produce_frozen',icon:'fruit'},{label:'deshidratado',profile:'produce_dried',unit:'oz',icon:'fruit'},{label:'comercialmente enlatado',profile:'produce_canned_commercial',unit:'oz',icon:'fruit'}],['Aguacate','Mango','Banano','Piña','Papaya','Coco','Rambután']);
const vegetables=['Tomate','Cebolla','Ajo','Chile dulce','Chile picante','Culantro','Cilantro','Papa','Yuca','Camote','Zanahoria','Repollo','Lechuga','Pepino','Maíz tierno','Elote','Ayote','Pataste','Habichuelas','Brócoli','Coliflor','Espinaca','Apio','Remolacha','Rábano','Berenjena','Calabacín','Chayote','Okra','Espárragos','Jengibre','Cúrcuma','Ñame','Malanga','Otoe'];
variants(vegetables,'Verduras y raíces','vegetable',[{label:'fresco',profile:'vegetable_fresh',common:true,icon:'leaf',alias:b=>[b.toLowerCase()]},{label:'congelado',profile:'produce_frozen',icon:'leaf'},{label:'deshidratado',profile:'produce_dried',unit:'oz',icon:'leaf'},{label:'comercialmente enlatado',profile:'produce_canned_commercial',unit:'oz',icon:'leaf'}],['Tomate','Cebolla','Ajo','Papa','Yuca','Culantro','Maíz tierno','Elote']);
many(['Conserva casera de fruta','Conserva casera de vegetales','Encurtido casero','Salsa casera en frasco'],'Verduras y raíces','home_preserve','produce_home_canned','volume','ml','jar');

many(['Arroz blanco','Arroz integral','Frijoles rojos','Frijoles negros','Frijoles blancos','Lentejas','Garbanzos','Harina de maíz','Harina de trigo','Avena','Quinua','Cebada','Trigo','Sorgo','Cereal de desayuno','Granola','Pasta seca','Macarrones secos','Espagueti seco'],'Granos y despensa','grain','dry_food','mass','lb','grain');
many(['Maíz seco','Semillas de chía','Linaza','Ajonjolí'],'Granos y despensa','grain','seed_food','mass','lb','grain');
many(['Pan blanco','Pan integral','Pan francés','Pan de molde','Baguette','Croissant','Donas','Muffins','Cupcakes','Galletas caseras','Torta seca','Pastel seco','Bizcocho','Pan de banano','Pan de yema','Pan de leche','Empanadas sin carne','Pastelitos sin carne','Tortas de maíz','Arepas sin relleno','Pupusas sin carne'],'Panes y comidas preparadas','baked','baked_goods','count','unit','bread');
many(['Pollo con arroz','Arroz con pollo','Sopa de pollo','Sopa de res','Carne asada preparada','Cerdo asado preparado','Pescado con arroz','Ensalada preparada','Pasta con salsa','Lasaña','Pizza','Hamburguesa','Hot dog','Sándwich','Burrito','Taco preparado','Baleada con huevo','Baleada con carne','Nacatamal con cerdo','Nacatamal con pollo','Montuca con pollo','Tamales con carne'],'Panes y comidas preparadas','prepared','prepared_mixed','count','unit','food');

many(['Papitas','Nachos','Totopos','Yuca chips','Tortilla chips','Palomitas de maíz','Pretzels','Galletas saladas','Galletas dulces','Galletas con chocolate','Galletas rellenas','Barquillos','Semillas de girasol tostadas','Barras de cereal','Barras de proteína','Chocolate en barra','Chocolate con leche','Chocolate negro','Caramelos','Confites','Gomitas','Malvaviscos','Turrón','Dulce de leche','Dulce de guayaba','Dulce de tamarindo','Dulce de mango','Dulce de papaya','Coco rallado seco','Cacahuates garapiñados','Chicles','Cereal seco','Galletas de avena','Brownies','Churros de maíz','Churros de queso','Churros picantes'],'Snacks y dulces','snack','dry_food','count','package','snack');
many(['Maní tostado','Almendras tostadas','Nueces tostadas','Marañones tostados','Pistachos'],'Snacks y dulces','snack','nuts_roasted','count','package','snack');

many(['Pimienta negra','Pimienta blanca','Comino','Canela','Orégano','Clavo de olor','Paprika','Curry','Ajo en polvo','Cebolla en polvo','Chile seco','Chile en polvo','Cúrcuma en polvo','Jengibre en polvo','Laurel seco','Tomillo seco','Romero seco','Nuez moscada','Sazonador mixto','Consomé de pollo en polvo','Consomé de res en polvo','Cacao en polvo','Chocolate en polvo','Horchata en polvo','Pinol'],'Condimentos y despensa','pantry','spices_dried','mass','oz','spice');
many(['Sal','Azúcar','Azúcar morena'],'Condimentos y despensa','pantry','dry_food','mass','oz','spice');
many(['Miel'],'Condimentos y despensa','pantry','honey','volume','ml','spice');
many(['Jarabe','Vainilla','Extracto de vainilla','Vinagre','Salsa de tomate comercial','Ketchup','Mostaza','Mayonesa','Salsa picante comercial','Salsa de soya','Salsa inglesa','Aceite vegetal','Aceite de oliva'],'Condimentos y despensa','pantry','dry_food','volume','ml','spice');

many(['Agua','Agua con gas','Refresco de cola','Refresco de naranja','Refresco de uva','Jugo de naranja','Jugo de manzana','Jugo de piña','Jugo de mango','Jugo de tamarindo','Jugo de maracuyá','Bebida energética','Bebida deportiva','Leche chocolatada','Horchata preparada','Café preparado','Té preparado','Chocolate caliente','Bebida de aloe','Agua de coco','Jarabe para bebida','Concentrado de jugo'],'Bebidas','beverage','tsa_liquid','volume','ml','drink');
many(['Cerveza','Cerveza artesanal','Vino tinto','Vino blanco','Vino rosado','Sidra alcohólica'],'Alcohol','alcohol','alcohol_under24','volume','L','bottle');
many(['Ron 40%','Aguardiente / guaro 40%','Whisky','Vodka','Tequila','Brandy','Coñac','Ginebra','Licor de café','Licor de frutas'],'Alcohol','alcohol','alcohol_24_70','volume','L','bottle');
many(['Ron overproof 151','Alcohol etílico >70%'],'Alcohol','alcohol','alcohol_over70','volume','L','bottle');

many(['Planta ornamental con raíz','Planta ornamental sin raíz','Orquídea','Cactus','Suculenta','Bonsái','Rosa cortada','Flores cortadas mixtas','Ramo de flores','Hojas frescas','Ramas decorativas','Hierbas frescas','Planta medicinal','Bulbos para sembrar','Tubérculos para sembrar'],'Plantas y semillas','plant','plant_material','count','unit','plant');
many(['Semillas de tomate','Semillas de chile','Semillas de maíz para sembrar','Semillas de frijol para sembrar','Semillas de cilantro','Semillas de albahaca','Semillas de flores','Semillas de árbol','Semillas de arbusto','Semillas de pasto','Semillas herbáceas','Semillas ornamentales'],'Plantas y semillas','seed','plant_seed','count','package','seed');
many(['Tierra de jardín','Suelo natural','Arena con materia orgánica','Compost','Turba','Musgo con tierra'],'Plantas y semillas','soil','soil','mass','lb','soil');

many(['Camisas','Camisetas','Blusas','Pantalones','Jeans','Shorts','Ropa interior','Calcetines','Brasieres','Pijamas','Chaquetas','Suéteres','Abrigos','Vestidos','Faldas','Trajes','Corbatas','Uniformes deportivos','Uniformes universitarios','Zapatos deportivos','Zapatos formales','Botas','Sandalias','Chanclas','Gorras','Sombreros','Cinturones','Bufandas','Guantes','Trajes de baño','Ropa de bebé','Pañales de tela','Toallas','Sábanas','Cobijas','Almohadas de viaje'],'Ropa y accesorios','clothing','ordinary','count','unit','shirt');
many(['iPhone / teléfono','Android / teléfono','MacBook / laptop','Laptop Windows','iPad / tablet','Tablet Android','Apple Watch / smartwatch','Reloj inteligente','Audífonos inalámbricos','Cámara','Cámara de acción','Router portátil','Consola portátil','Nintendo Switch','Steam Deck','Kindle / lector electrónico','AirTag / rastreador'],'Electrónicos','electronics','lithium_device','count','unit','laptop');
many(['Audífonos con cable','Cargador de teléfono','Cargador de laptop','Cable USB','Adaptador de corriente','Trípode','Memoria USB','Disco duro externo','SSD externo','Mouse','Teclado','Calculadora','Proyector portátil','Secador de cabello','Plancha de cabello','Máquina de afeitar eléctrica','Cepillo dental eléctrico'],'Electrónicos','electronics','ordinary','count','unit','laptop');
many(['Power bank hasta 100 Wh','Batería de litio de repuesto hasta 100 Wh','Batería de cámara de repuesto'],'Electrónicos','battery','power_bank_100','count','unit','battery');
many(['Power bank 101–160 Wh','Batería de litio de repuesto 101–160 Wh'],'Electrónicos','battery','power_bank_160','count','unit','battery');
many(['Batería de litio >160 Wh'],'Electrónicos','battery','battery_over160','count','unit','battery');
many(['Pilas AA / AAA alcalinas','Pila de botón'],'Electrónicos','battery','dry_battery','count','unit','battery');

many(['Shampoo','Acondicionador','Gel de baño','Jabón líquido','Pasta dental','Enjuague bucal','Perfume','Colonia','Desodorante roll-on','Crema corporal','Crema facial','Protector solar','Gel para cabello','Maquillaje líquido','Base líquida','Rímel','Esmalte de uñas','Removedor de esmalte','Aceite para cabello','Gel antibacterial','Alcohol para frotar'],'Cuidado personal','personal_care','toiletry_liquid','volume','ml','bottle');
many(['Desodorante aerosol','Laca para cabello','Espuma de afeitar','Repelente de insectos para piel','Champú seco aerosol'],'Cuidado personal','personal_care','toiletry_aerosol','volume','ml','bottle');
many(['Jabón en barra','Labial','Toallitas húmedas','Pañales desechables','Talco'],'Cuidado personal','personal_care','ordinary','count','unit','bottle');

many(['Ibuprofeno','Acetaminofén / paracetamol','Aspirina','Antihistamínico','Antácido','Vitaminas','Suplementos comunes','Insulina','Inhalador','EpiPen','Jarabe para la tos','Gotas para ojos','Gotas para oídos','Crema medicada','Ungüento medicado','Pastillas anticonceptivas','Jeringas para medicamento','Lancetas'],'Medicamentos y salud','health','medication','count','unit','pill');
many(['Medicamento recetado','Antibiótico recetado','Medicamento para presión arterial','Medicamento para diabetes'],'Medicamentos y salud','health','medication','days','day','pill');
many(['Glucómetro','Monitor de presión','Termómetro digital','CPAP','Nebulizador','Muletas','Bastón','Silla de ruedas','Kit de primeros auxilios','Vendas','Gasas'],'Medicamentos y salud','health','medical_device','count','unit','pill');
many(['Compresas frías instantáneas'],'Medicamentos y salud','health','tsa_special','count','unit','pill');
many(['Medicamento líquido recetado'],'Medicamentos y salud','health','medication','volume','ml','pill');
many(['Medicamento controlado recetado'],'Medicamentos y salud','health','controlled_medication_review','days','day','pill');
many(['Solución salina','Lentes de contacto y solución'],'Medicamentos y salud','health','tsa_medical_liquid','volume','ml','bottle');
many(['Oxígeno médico portátil'],'Medicamentos y salud','health','oxygen','count','unit','pill');

many(['Pasaporte','Visa estadounidense','Boleto aéreo','Reserva de hotel','Seguro de viaje','Licencia de conducir','Carnet universitario','Carta de invitación','Receta médica','Carta del médico','Certificado de vacunación','Itinerario de viaje','Copia de documentos','Tarjetas de crédito','Tarjetas de débito'],'Documentos y dinero','documents_money','ordinary','count','unit','document');
many(['Dinero en efectivo USD','Dinero en efectivo HNL','Cheques de viajero','Giros postales','Valores al portador'],'Documentos y dinero','documents_money','cash','money','USD','document');

many(['Artesanía de madera','Máscara de madera','Figura de madera','Cesta de palma','Sombrero de palma','Artesanía de bambú'],'Regalos y recuerdos','souvenir','plant_souvenir','count','unit','gift');
many(['Conchas marinas','Coral','Plumas','Piel o cuero animal','Hueso o diente animal','Caracol decorativo','Perlas'],'Regalos y recuerdos','souvenir','wildlife_souvenir','count','unit','gift');
many(['Joyería','Reloj de regalo','Ropa de regalo','Juguete','Muñeco','Libro','Revista','Fotografía','Cuadro','Cerámica','Taza','Llaveros','Imanes','Recuerdos turísticos'],'Regalos y recuerdos','souvenir','ordinary','count','unit','gift');

many(['Mochila','Maleta carry-on','Maleta facturada','Bolso personal','Riñonera','Botella vacía reutilizable','Paraguas','Almohada de cuello','Candado TSA','Báscula de equipaje','Adaptador universal','Linterna','Navaja de afeitar desechable','Tijeras pequeñas','Cortaúñas','Pinzas','Agujas de coser','Kit de costura','Pelota de fútbol','Pelota de baloncesto','Guantes de portero','Raqueta de tenis','Casco deportivo','Patines','Skateboard','Equipo de snorkel','Aletas de natación','Gafas de natación','Caña de pescar','Anzuelos'],'Equipaje y artículos de viaje','travel_gear','ordinary','count','unit','suitcase');
many(['Tijeras grandes','Bate deportivo','Palos de golf','Herramientas pequeñas','Destornillador','Martillo','Taladro','Cuchillo de cocina'],'Equipaje y artículos de viaje','travel_gear','checked_only_tool','count','unit','suitcase');
many(['Linterna con batería de litio'],'Equipaje y artículos de viaje','travel_gear','lithium_device','count','unit','battery');

many(['Cigarrillos'],'Tabaco','tobacco','tobacco_cigarette','count','unit','box');
many(['Puros / cigarros'],'Tabaco','tobacco','tobacco_cigar','count','unit','box');
many(['Tabaco para pipa','Tabaco de mascar'],'Tabaco','tobacco','tobacco_other','mass','oz','box');
many(['Cigarrillos electrónicos / vape'],'Tabaco','tobacco','vape','count','unit','battery');
many(['Fórmula para bebé en polvo'],'Bebés','baby','dry_food','mass','oz','bottle');
many(['Fórmula para bebé líquida','Leche materna'],'Bebés','baby','tsa_medical_liquid','volume','ml','bottle');
many(['Comida para bebé comercial','Puré para bebé comercial'],'Bebés','baby','prepared_mixed','mass','oz','food');
many(['Coche de bebé / stroller','Asiento infantil para automóvil'],'Bebés','baby','ordinary','count','unit','suitcase');
many(['Juguete con batería'],'Bebés','baby','lithium_device','count','unit','battery');
many(['Proteína en polvo','Creatina en polvo','Electrolitos en polvo'],'Nutrición','nutrition','dry_food','mass','oz','grain');
many(['Multivitamínicos','Aceite de pescado en cápsulas','Melatonina'],'Nutrición','nutrition','medication','count','unit','pill');
many(['Proteína líquida / shake'],'Nutrición','nutrition','tsa_liquid','volume','ml','drink');
many(['Comida para perro comercial seca','Comida para gato comercial seca'],'Mascotas','pet','dry_food','mass','lb','food');
many(['Premios comerciales para perro','Premios comerciales para gato'],'Mascotas','pet','animal_product_review','mass','oz','food');
many(['Collar de mascota','Correa de mascota'],'Mascotas','pet','ordinary','count','unit','gift');
many(['Artículos religiosos de madera'],'Otros','misc','plant_souvenir','count','unit','gift');
many(['Velas','Instrumento musical pequeño','Guitarra','Termo / vaso térmico vacío','Marcadores','Bolígrafos','Cuadernos','Libros','Discos / CD / DVD'],'Otros','misc','ordinary','count','unit','box');
many(['Fósforos de seguridad','Compresas frías instantáneas'],'Otros','misc','tsa_special','count','unit','box');
many(['Encendedor común'],'Otros','misc','lighter','count','unit','box');
many(['Hielo sólido'],'Otros','misc','ordinary','mass','lb','box');
many(['Hielo seco'],'Otros','misc','dry_ice','mass','lb','box');
many(['Pegamento escolar','Pinturas artísticas al agua'],'Otros','misc','tsa_liquid','volume','ml','bottle');

export const UNIT_OPTIONS={count:['unit','package','bottle','can','box','pair'],mass:['mg','g','kg','oz','lb'],volume:['ml','L','fl_oz','cup','pint','quart','gallon'],days:['day'],money:['USD'],battery:['Wh']};
export const CATALOG=C;
export const SECTIONS=[...new Set(C.map(x=>x.section))];
export function searchCatalog(query='',section='all'){
 const q=String(query||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();
 return C.filter(item=>{if(section!=='all'&&item.section!==section)return false;if(!q)return true;const h=[item.name_es,...item.aliases].join(' ').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();return q.split(/\s+/).every(t=>h.includes(t));}).sort((a,b)=>(Number(b.common_hn)-Number(a.common_hn))||(a.sort_weight-b.sort_weight)||a.name_es.localeCompare(b.name_es,'es'));
}
