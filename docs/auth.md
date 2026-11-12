# Autenticación y sesiones

## Contrato real del Server (verificado 2026-11-07)

| Endpoint | Uso en Lumia Admin | Notas del Server |
|---|---|---|
| `POST /api/auth/login` `{email,password,rememberMe?}` | `server/api/auth/login.post.ts` | Requiere `AUTH_LOCAL_ENABLED=true` (403 si no). Con 2FA responde `{requires2fa, tempToken, userId}` sin cookies. Sin 2FA emite `lumia_access` (10 min) y `lumia_refresh` (7 d / 30 d con rememberMe). |
| `POST /api/auth/2fa/verify` `{tempToken, code}` | `server/api/auth/two-factor.post.ts` | `code` de 6 a 8 caracteres. Emite las mismas cookies. |
| `POST /api/auth/refresh` | `server/utils/server-api.ts` | Lee el refresh **solo de cookie**. **Rota** el refresh token: el anterior deja de existir (401 si se reutiliza). |
| `POST /api/auth/logout` | `server/api/auth/logout.post.ts` | Revoca solo la sesión del refresh token enviado. |
| `POST /api/auth/logout-all` | **No se usa** | Revoca todas las sesiones del usuario, incluida la de Lumia 2.0. |
| `GET /api/auth/me` | `server/utils/session-profile.ts` | `UserDomain`. Acepta Bearer o cookie. Valida la sesión en Mongo y `permissionsVersion` (401 `STALE_AUTHORIZATION` si cambió). |
| `GET /api/auth/permissions` | `server/utils/session-profile.ts` | `{permissions, permHash, permissionsVersion}`: permisos efectivos (RBAC dinámico). |

## Problema de cookies

El Server emite sus cookies con los atributos de su entorno:

- Producción (`server/.env.production`): `Domain=.lumiadalistore.com; Secure; SameSite=None; HttpOnly; Path=/`.
- Desarrollo (`server/.env.development` y compose dev): sin Domain, `Secure` desactivado, `SameSite=Lax`.

Si el BFF reenviara esos `Set-Cookie` al navegador (como hacen Lumia y Lumia 2.0):

1. Contra el Server de producción, el navegador en `http://localhost:3100` **descarta** las cookies (el Domain no coincide). El Lumia antiguo lo evita reescribiendo cookies **solo si el host es localhost**, así que por IP de LAN se rompe.
2. Las cookies se llamarían igual que las de la tienda (`lumia_access`/`lumia_refresh`). En un mismo dominio una sesión pisaría a la otra.

## Solución implementada: token handler en el BFF

`server/utils/admin-session.ts`:

1. El BFF lee los tokens de los `Set-Cookie` del Server (sin importar Domain/Secure/SameSite).
2. Los guarda en cookies **propias**: `lumia_admin_at` (acceso), `lumia_admin_rt` (refresh) y `lumia_admin_2fa` (tempToken, 5 min). Todas son `HttpOnly; SameSite=Strict; Path=/api`, host-only (sin Domain) y `Secure` configurable (`NUXT_SESSION_COOKIE_SECURE`, true por defecto).
3. En cada llamada, el BFF reconstruye `Cookie: lumia_access=…` (o `lumia_refresh=…` para refresh y logout) hacia el Server. Los nombres son configurables (`NUXT_SERVER_*_COOKIE_NAME`).
4. La cookie de acceso caduca 15 s antes que el JWT.

Resultado:

- **Sesiones independientes.** Cada login crea su propio documento en `sessions`. Cerrar sesión en Lumia Admin revoca solo esa sesión; Lumia 2.0 sigue activa, y al revés.
- **El mismo código funciona en desarrollo y producción**, porque no depende de los atributos de las cookies del Server.
- El navegador nunca ve los tokens. El `tempToken` del 2FA tampoco sale del BFF.

## Renovación

`server/utils/server-api.ts`:

- Sin cookie de acceso pero con refresh, el BFF renueva antes de llamar.
- Si el Server responde 401 (JWT caducado o `STALE_AUTHORIZATION` porque cambiaron los permisos), renueva **una vez** y reintenta. El 401 ocurre en el preHandler del Server, antes de ejecutar el handler, así que el reintento no duplica efectos.
- **Deduplicación**: el Server rota el refresh token, de modo que dos renovaciones simultáneas (varias pestañas o peticiones en paralelo) cerrarían la sesión. Las renovaciones se agrupan por hash del token y el resultado se conserva 15 s para las peticiones rezagadas. El estado vive en memoria, por lo que es válido para **una instancia**. Con varias réplicas habría que usar un almacén compartido o afinidad de sesión.
- Si la renovación falla, el BFF borra las cookies y responde 401 `SESSION_EXPIRED`. El cliente (`useAdminApi`) vuelve al login con `?redirect=`.

## Acceso al panel

Después del login (y en cada `GET /api/session`), el BFF exige `admin.access`, el mismo requisito que `adminGuard` del Server. Si falta, revoca la sesión recién creada y responde 403 `NO_ADMIN_ACCESS`. El rol (`admin`/`moderator`) **no** se usa para decidir.

## CSRF

`server/middleware/request-guard.ts`:

- Cookies con `SameSite=Strict`.
- Los métodos que modifican estado exigen un `Origin` igual al origen de la app o incluido en `NUXT_ALLOWED_ORIGINS`.
- El cuerpo debe ser JSON (415 en otro caso), con un máximo de 256 KB.

## Google OAuth: no habilitado

`server/src/modules/identity/services/google-oauth.service.ts` construye el `redirect_uri` **y** la redirección final con un único `FRONTEND_URL` (en producción, la tienda). Además:

- El callback vuelve a calcular el `redirect_uri` para el intercambio del código. Si un frontend lo reescribe (como hace el proxy del Lumia antiguo), Google responde `redirect_uri_mismatch` y el Server devuelve `LG_ERROR003`.
- Las cookies `oauth_state`/`oauth_return` usan `Path=/api/auth/google` y el `COOKIE_DOMAIN` del Server.
- El callback emite las cookies de sesión del Server **directamente al navegador**, lo que es incompatible con el token handler.

### Propuesta para soportar ambos frontends (requiere cambios en el Server, a aprobar)

1. Server: `OAUTH_CLIENTS`, una lista blanca `{ id, callbackUrl, returnOrigin }`, por ejemplo `storefront → https://lumiadalistore.com/api/auth/google/callback` y `admin → http://localhost:3100/api/auth/google/callback`. `GET /api/auth/google?client=admin` firma el `client` dentro del `state` (HMAC o cookie). El callback toma el `redirect_uri` de esa entrada y no de `FRONTEND_URL`. El flujo de la tienda queda idéntico (cliente por defecto `storefront`).
2. Para el admin, el callback no debe poner cookies en el navegador. Debe emitir un **código de un solo uso** de vida corta (30–60 s, guardado en Redis o Mongo) y redirigir a `callbackUrl?code=…`. El BFF de Lumia Admin lo canjea servidor a servidor (`POST /api/auth/google/exchange`) por tokens, que se guardan con el token handler.
3. Registrar el `callbackUrl` del admin en Google Cloud Console.

Mientras tanto, el admin usa login local con 2FA. Esto requiere `AUTH_LOCAL_ENABLED=true` en el Server, que es el valor en `.env.development` y `.env.production` al momento de la auditoría.
