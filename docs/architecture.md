# Arquitectura

## Principio

Separar la bitácora personal de la normativa. Los viajes guardan datos históricos; cada artículo conserva la regla y versión que se utilizó al evaluarlo.

## Datos personales

`profiles`, `trips`, `trip_bags`, `trip_items`, `trip_documents`, `inspections`, `compliance_snapshots` usan RLS por `auth.uid()`.

## Datos regulatorios

`catalog_items`, `regulatory_sources` y `regulatory_rules` son de lectura para usuarios autenticados. Las escrituras regulatorias no se conceden al cliente público.

## Documentos

Bucket privado `travel-documents`. Las políticas exigen que el primer segmento del objeto sea el UUID del usuario autenticado.

## Evolución

1. Ampliar catálogo y reglas por ACIR/VS Permitting Assistant.
2. Añadir catálogo TSA por carry-on/facturada.
3. Añadir reglas FDA/FWS para categorías derivadas.
4. Automatizar revisión de fuentes sin sobrescribir versiones históricas.
5. Añadir exportación PDF/CSV del expediente de viaje.
