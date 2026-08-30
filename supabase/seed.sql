-- Minimal checked-in seed. Production currently has a larger seed (30 catalog items, 10 sources, 31 rules).
insert into public.regulatory_sources(agency,title,url,jurisdiction,effective_from) values
('USDA-APHIS','Traveling From Another Country','https://www.aphis.usda.gov/traveling-with-ag-products/another-country','US','2026-03-31'),
('USDA-APHIS','Meats, Poultry, and Seafood','https://www.aphis.usda.gov/traveling-with-ag-products/meats-poultry-seafood','US','2026-01-13'),
('USDA-APHIS','Honduras HPAI Import Alert','https://www.aphis.usda.gov/sites/default/files/import-alert-hpai-honduras.pdf','US','2026-06-18'),
('USDA-APHIS','Fruits and Vegetables','https://www.aphis.usda.gov/traveling-with-ag-products/fruits-vegetables','US','2026-01-13'),
('USDA-APHIS','Milk, Dairy, and Egg Products','https://www.aphis.usda.gov/traveling-with-ag-products/milk-dairy-eggs','US','2026-01-13'),
('USDA-APHIS','Coffee, Tea, Honey, Nuts, and Spices','https://www.aphis.usda.gov/traveling-with-ag-products/coffee-tea-honey-nuts-spices','US','2026-01-13')
on conflict(agency,url) do nothing;
insert into public.catalog_items(canonical_name_es,canonical_name_en,category,subcategory,default_risk,aliases) values
('Café tostado o molido','Roasted or ground coffee','food','coffee','low',array['cafe','café molido','coffee']),
('Queso sólido sin carne','Solid cheese without meat','food','dairy','low',array['queso','quesillo sólido','solid cheese']),
('Pollo o gallina crudos','Raw poultry','food','poultry','high',array['pollo crudo','gallina cruda','raw chicken']),
('Pollo o gallina completamente cocidos','Fully cooked poultry','food','poultry','medium',array['pollo frito','gallina asada','cooked chicken']),
('Fruta fresca','Fresh fruit','food','fresh_fruit','high',array['mango','aguacate','naranja','banano','fresh fruit'])
on conflict(canonical_name_es,category) do nothing;
