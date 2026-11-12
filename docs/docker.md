# Docker y entornos

## Lo que existe en el Server (verificado, sin modificar)

- `server/docker-compose.yml` crea la red `lumia-network` (bridge, **no externa**). Con el nombre de proyecto `server`, Docker la llama **`server_lumia-network`**.
- Servicios de la API según el perfil de `docker-compose.dev.yml`:

| Perfil | Servicio | `container_name` | DNS en la red | Datos |
|---|---|---|---|---|
| `local` | `api` | (auto) | `api` | Mongo del compose |
| `atlas` | `api-atlas` | `server-api` | `server-api`, `api-atlas` | URIs de `.env.development` |
| `prod` | `api-prod` | `server-api` | `server-api`, `api-prod` | URIs de **`.env.production`** (Atlas de producción) |

- Puerto interno de la API: `3001`. También se publica en el host como `3001`.
- Al momento de la verificación corría el perfil **atlas** (`server-api`, `NODE_ENV=development`). El host de Mongo de `.env.development` es distinto del de `.env.production`.

## Lumia Admin

- `Dockerfile`: multi-stage `node:24-alpine`. El runtime solo contiene `.output`, corre como usuario `node` (uid 1000) y tiene healthcheck sobre `/api/health`.
- `docker-compose.yml`: servicio `admin` (contenedor `lumia-admin`) que se **une como externa** a `server_lumia-network`. Publica solo en `127.0.0.1:3100`, con sistema de archivos de solo lectura y `no-new-privileges`. No redefine ni toca servicios del Server.

```bash
# 1) Server levantado (crea la red)
cd ../server && npm run docker:dev:atlas
# 2) Lumia Admin
cd ../lumia-admin
cp .env.example .env    # NUXT_API_BASE_URL=http://server-api:3001 (perfil local: http://api:3001)
docker compose up -d --build
# http://localhost:3100
```

Si la red no existe, `docker compose up` falla con `network server_lumia-network declared as external, but could not be found`: levanta primero el Server. Si el Server se lanzó con otro nombre de proyecto, ajusta `SERVER_DOCKER_NETWORK`.

### Fuera de Docker

```bash
npm install
NUXT_API_BASE_URL=http://127.0.0.1:3001 npm run dev   # http://localhost:3100
```

## Entornos de datos

| Server con… | Base de datos | Uso recomendado |
|---|---|---|
| perfil `local` | Mongo en Docker (datos copiados con `db:sync-from-prod`) | Desarrollo de módulos con escritura |
| perfil `atlas` | Atlas de `.env.development` | Desarrollo contra datos de prueba remotos |
| perfil `prod` | **Atlas de producción** | Solo para operar la tienda real |

Lumia Admin no elige la base de datos: usa el Server al que apunta `NUXT_API_BASE_URL`. Para que nadie opere sin saberlo, la barra superior muestra siempre el entorno (`GET /api/admin/meta`) y, con producción, un aviso rojo permanente.

Ten en cuenta que el Server infiere el tier (`inferDatabaseTier`) y que con `NODE_ENV=development` siempre reporta "development", aunque las URIs sean de Atlas.

`.env.example` no contiene credenciales y apunta por defecto a `server-api`. El Server en uso define a qué datos llega.
