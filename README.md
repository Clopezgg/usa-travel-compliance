# EntrySafe USA

PWA personal para registrar viajes Honduras → Estados Unidos y evaluar preparación aduanera/agropecuaria con reglas versionadas y fuentes oficiales.

## Estado de la V1

Funcional en navegador/iPhone para:

- registro e inicio de sesión con Supabase Auth;
- creación e historial de viajes;
- maletas por viaje;
- catálogo regulatorio y búsqueda por sinónimos;
- evaluación de artículos con reglas USDA/CBP versionadas;
- marcado de artículos declarados;
- score de preparación limitado a cobertura implementada;
- resumen en inglés para declaración;
- documentos privados en Supabase Storage;
- snapshots históricos del balance;
- PWA instalable desde Safari;
- RLS por usuario en todas las tablas personales.

## Arquitectura

- Frontend: HTML/CSS/JavaScript PWA estática.
- SDK: `@supabase/supabase-js` 2.112.4 desde ESM CDN.
- Backend: Supabase Auth + Postgres + Storage.
- Hosting objetivo: Render Static Site mediante `render.yaml`.
- CI: GitHub Actions sin dependencias de build.

## Seguridad

La clave incluida en `web/config.js` es la **publishable key** del proyecto y está diseñada para cliente público. Nunca añadir `service_role` ni secret keys al repositorio. La protección de datos depende además de las políticas RLS aplicadas en Supabase.

## Limitaciones deliberadas

- La app no calcula una “probabilidad de admisión migratoria”.
- El score no sustituye decisión de CBP/USDA/TSA.
- TSA tiene cobertura visible como pendiente en la V1; no se infiere como evaluado.
- Las comidas mixtas se marcan para revisión si no existe una regla específica por ingredientes.
- La decisión final de entrada de un producto corresponde a los inspectores estadounidenses.

## Render

El Blueprint está en `render.yaml` y publica `./web` como sitio estático. Después de conectar este repositorio en Render, los pushes a la rama desplegada actualizan el sitio automáticamente.

## Desarrollo local

Sirve la carpeta raíz con cualquier servidor HTTP estático, por ejemplo:

```bash
python3 -m http.server 8080
```

Luego abre `http://localhost:8080/web/`.
