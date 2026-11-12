# BFF (Nitro) → Server

```
Navegador ──/api/*──▶ Lumia Admin (Nitro) ──HTTP privado──▶ Server Fastify ──▶ MongoDB
```

## Endpoints expuestos al navegador

| BFF | Server | Permiso en el Server |
|---|---|---|
| `GET /api/health` | `GET /api/auth/me` sin credenciales (401 = alcanzable) | — |
| `GET /api/session` | `GET /api/auth/me` + `GET /api/auth/permissions` | sesión + `admin.access` (verificado en el BFF) |
| `POST /api/auth/login` | `POST /api/auth/login` | — |
| `POST /api/auth/two-factor` | `POST /api/auth/2fa/verify` | — |
| `POST /api/auth/logout` | `POST /api/auth/logout` | — |
| `GET /api/admin/dashboard` | `GET /api/admin/dashboard/stats` | `admin.access` |
| `GET /api/admin/environment` | `GET /api/admin/meta` (sin `apiUrl`) | `admin.access` |
| `GET /api/admin/categories` | `GET /api/admin/categories` (búsqueda escapada) | `categories.read` |
| `POST /api/admin/categories` | `POST /api/admin/categories` | `categories.create` |
| `PATCH /api/admin/categories/:id` | `PATCH /api/admin/categories/:id` | `categories.update` |
| `DELETE /api/admin/categories/:id` | `DELETE /api/admin/categories/:id` | `categories.delete` |
| `GET /api/admin/products` | `GET /api/admin/products` (búsqueda escapada) | `products.read` |
| `POST /api/admin/products` | `POST /api/admin/products` | `products.create` |
| `GET /api/admin/products/:id` | `GET /api/admin/products/:id` | `products.read` |
| `PATCH /api/admin/products/:id` | `PATCH /api/admin/products/:id` (sin `slug`) | `products.update` |
| `DELETE /api/admin/products/:id` | `GET` + `DELETE /api/admin/products/:id` (409 si tiene variantes) | `products.delete` |
| `PUT /api/admin/products/:id/inventory/:sku` | `PUT /api/admin/products/:id/inventory/:sku` | `products.update` |
| `POST /api/admin/products/:id/variants` | `POST /api/admin/products/:id/variants` (moneda fijada por el BFF) | `products.update` |
| `PATCH /api/admin/products/:id/variants/:sku` | `PATCH /api/admin/products/:id/variants/:sku` (sin cambiar SKU) | `products.update` |
| `DELETE /api/admin/products/:id/variants/:sku` | `GET` producto + `DELETE …/variants/:sku` (409 con reservas) | `products.update` |
| `GET /api/admin/promotions` | `GET /api/admin/promotions` (`lifecycle`, búsqueda escapada por el Server) | `products.read` |
| `GET /api/admin/promotions/:id` | `GET /api/admin/promotions/:id` | `products.read` |
| `POST /api/admin/promotions` | `POST /api/admin/promotions` | `products.update` |
| `PUT /api/admin/promotions/:id` | `GET` + `PATCH /api/admin/promotions/:id` (reemplazo; conserva la imagen de notificación) | `products.update` |
| `PATCH /api/admin/promotions/:id/active` | `PATCH /api/admin/promotions/:id/active` | `products.update` |
| `DELETE /api/admin/promotions/:id` | `DELETE /api/admin/promotions/:id` | `products.update` |
| `GET /api/admin/banners` | `GET /api/admin/store-banners` | `products.read` |
| `POST /api/admin/banners` | `POST /api/admin/store-banners` (URLs seguras) | `products.update` |
| `PUT /api/admin/banners/:id` | `GET` + `PATCH /api/admin/store-banners/:id` (reemplazo; conserva `collection_slug`) | `products.update` |
| `DELETE /api/admin/banners/:id` | `DELETE /api/admin/store-banners/:id` | `products.update` |
| `GET /api/admin/settings/shipping` | `GET /api/admin/store-shipping-settings` | `admin.access` |
| `PUT /api/admin/settings/shipping` | `PUT /api/admin/store-shipping-settings` (esquema estricto; `calculationType` = `flat_rate`) | `admin.access` |
| `POST /api/admin/settings/shipping-reset` | `POST /api/admin/store-shipping-settings/reset` | `admin.access` |
| `GET /api/admin/settings/currency` | `GET /api/admin/store-currency-settings` | `admin.access` |
| `PATCH /api/admin/settings/currency` | `PATCH /api/admin/store-currency-settings` (sin `code`) | `admin.access` |
| `GET /api/admin/settings/customer` | `GET /api/admin/store-customer-settings` | `admin.access` |
| `PATCH /api/admin/settings/customer` | `PATCH /api/admin/store-customer-settings` (esquema estricto) | `admin.access` |
| `GET /api/admin/settings/payments` | `GET /api/admin/store-payment-settings` | `admin.access` |
| `PATCH /api/admin/settings/payments` | `GET` + `PATCH /api/admin/store-payment-settings` (Mercado Pago bloqueado) | `admin.access` |
| `GET /api/admin/feedback/reports` | `GET /api/admin/feedback/reports` (solo page/limit) | `admin.access` |
| `PATCH /api/admin/feedback/reviews/:id` | `PATCH /api/admin/feedback/reviews/:id` (solo `hidden`) | `admin.access` |
| `PATCH /api/admin/feedback/questions/:id` | `PATCH /api/admin/feedback/questions/:id` (solo `hidden`) | `admin.access` |
| `GET /api/admin/users` | `GET /api/admin/security/users` (`staff=1` → `staffOnly`) | `admin.users.read` |
| `GET /api/admin/users/:id` | `GET /api/admin/security/users/:id` + sesión actual (`isSelf`) | `admin.users.read` |
| `GET /api/admin/users/assignable-roles` | `GET /api/admin/security/roles` (sin archivados, hasta 100) | `admin.roles.read` |
| `POST /api/admin/users/:id/roles` | comprobaciones (`assertRoleChangeAllowed`) + `POST /api/admin/security/users/:id/roles` | `admin.users.manage` (+ `admin.roles.read` para la comprobación) |
| `DELETE /api/admin/users/:id/roles/:roleId` | comprobaciones + `DELETE /api/admin/security/users/:id/roles/:roleId` | `admin.users.manage` (+ `admin.roles.read`) |
| `GET /api/admin/roles` | `GET /api/admin/security/roles` + `GET /api/admin/security/roles/export` (archivados) | `admin.roles.read` |
| `GET /api/admin/roles/:id` | `GET /roles/:id` + `GET /roles/effective/:id` + catálogo | `admin.roles.read` |
| `POST /api/admin/roles` | `POST /api/admin/security/roles` (sin escalada) | `admin.roles.manage` |
| `PATCH /api/admin/roles/:id` | `GET` + `PATCH /api/admin/security/roles/:id` (versión, sin escalada) | `admin.roles.manage` |
| `DELETE /api/admin/roles/:id` | `DELETE /api/admin/security/roles/:id` (sin usuarios ni herederos) | `admin.roles.manage` |
| `POST /api/admin/roles/:id/archive` | `POST /api/admin/security/roles/archive/:id` (sin usuarios ni herederos) | `admin.roles.manage` |
| `POST /api/admin/roles/:id/restore` | `POST /api/admin/security/roles/restore/:id` (sin escalada) | `admin.roles.manage` |
| `POST /api/admin/roles/:id/duplicate` | `POST /api/admin/security/roles/duplicate/:id` (sin escalada) | `admin.roles.manage` |
| `GET /api/admin/audit/access` | `GET /api/admin/audit-log` (`from`/`to` en hora de la tienda → UTC; sin `event` si hay búsqueda) | `admin.audit.read` |
| `GET /api/admin/audit/permissions` | `GET /api/admin/security/permission-audit` (`dateFrom`/`dateTo`; sin `before`/`after`) | `admin.audit.read` |
| `GET /api/admin/analytics` | `GET /api/admin/analytics/overview` + `GET /api/admin/analytics/sales` (ticket y variación recalculados) | `analytics.read` |
| `POST /api/admin/images/product` | `POST /api/admin/product-images/generate` (multipart reconstruido; timeout 180 s) | `products.update` |
| `POST /api/admin/images/site` | `POST /api/admin/site-images/generate` (multipart reconstruido; timeout 180 s) | `products.update` |
| `POST /api/admin/images/material` | `POST /api/admin/production/materials/images/generate` (multipart reconstruido; timeout 180 s) | `materials.update` |
| `GET /api/admin/production/pricing/products` | `GET /api/admin/production/recipes/products` (`status` → `repostStatus`) | `recipes.read` |
| `GET /api/admin/production/pricing/products/:id` | `GET /api/admin/products/:id` (datos de producción de variantes) | `products.read` |
| `POST/DELETE /api/admin/production/pricing/products/:id/recipe` | `POST/DELETE /api/admin/products/:id/recipe` (solo recetas activas) | `recipes.update` |
| `PUT /api/admin/production/pricing/products/:id/variants/:sku/recipe` | `PATCH /api/admin/products/:id/variants/:sku/recipe` | `products.update` |
| `POST /api/admin/production/pricing/products/:id/submit` | `POST /api/admin/production/recipes/products/:id/repost-prices` (crea solicitudes; no cambia precios) | `costing.manage` |
| `GET /api/admin/production/approvals` | `GET …/approvals` + `…/approvals/summary` (+ IVA y precio actual por producto) | `costing.read` |
| `POST /api/admin/production/approvals/:id/approve` · `…/reject` | `POST …/approvals/approve` · `…/reject` (una solicitud por llamada) | `costing.manage` |
| `POST /api/admin/production/approvals/:id/publish` | comprobaciones (base con IVA, precio actual, IVA del producto; el Server las repite) + `POST …/approvals/publish` | `costing.manage` |
| `GET/POST /api/admin/production/recipes` | `GET/POST /api/admin/production/recipes` (producto y materiales comprobados) + `POST …/:id/calculate-cost` | `recipes.read` / `recipes.create` |
| `GET/PATCH/DELETE /api/admin/production/recipes/:id` | receta + `…/versions` + `…/associated-products`; `PATCH` (versión) + cálculo; `DELETE` (sin asignaciones) | `recipes.read` / `recipes.update` / `recipes.delete` |
| `POST /api/admin/production/recipes/:id/calculate` | `POST …/:id/calculate-cost` | `recipes.update` |
| `GET /api/admin/production/recipe-products` | `GET /api/admin/production/recipes/products` (selector, 20 resultados) | `recipes.read` |
| `GET/POST /api/admin/production/materials` | `GET/POST /api/admin/production/materials` (alta sin costo; nombre único) | `materials.read` / `materials.create` |
| `GET/PATCH/DELETE /api/admin/production/materials/:id` | ficha + `GET …/price-history`; `PATCH` (unidad de compra bloqueada con costo); `DELETE` | `materials.read` / `materials.update` / `materials.delete` |
| `POST /api/admin/production/materials/:id/prices` | `POST …/price-history` (unidad fijada, proveedor vinculado) | `materials.update` |
| `POST /api/admin/production/materials/:id/suppliers` | `GET /suppliers/:id` (activo) + `POST …/suppliers` (un solo preferido) | `materials.update` |
| `DELETE /api/admin/production/materials/:id/suppliers/:supplierId` | `DELETE …/suppliers/:supplierId` | `materials.update` |
| `GET/POST /api/admin/production/suppliers`, `PATCH …/:id` | mismos endpoints del Server (sin `DELETE`) | `suppliers.read` / `suppliers.create` / `suppliers.update` |
| `GET/POST /api/admin/production/units`, `PATCH …/:id` | mismos endpoints (`PATCH` solo nombre, orden y estado; sin `DELETE`) | `units.read` / `units.create` / `units.update` |
| `GET /api/admin/inventory` | `GET /api/admin/inventory` | `products.read` |
| `PUT /api/admin/inventory/:sku` | `PUT /api/admin/inventory/:sku` | `products.update` |
| `GET /api/admin/orders` | `GET /api/admin/orders` (búsqueda escapada, `channel`) | `orders.read` |
| `GET /api/admin/orders/:id` | `GET /api/admin/orders/:id` | `orders.read` |
| `POST /api/admin/orders/:id/status` | `GET` + `PATCH /api/admin/orders/:id` `{status}` (transición validada) | `orders.update` |
| `PUT /api/admin/orders/:id/notes` | `PATCH /api/admin/orders/:id` `{notes}` | `orders.update` |
| `POST /api/admin/orders/:id/cancellation` | `GET` + `PATCH /api/admin/orders/:id/cancellation` (exige solicitud abierta) | `orders.update` |
| `POST /api/admin/orders/:id/deposit` | `GET` + `POST /api/admin/orders/:id/deposit` (paso `configure`) | `orders.update` |
| `POST /api/admin/orders/:id/deposit/pay` | `GET` + `POST …/deposit/pay` (paso `pay_deposit`, monto ≤ total) | `orders.update` |
| `POST /api/admin/orders/:id/final-payment` | `GET` + `POST …/final-payment/pay` (paso `pay_final`, monto ≤ total) | `orders.update` |
| cualquier otro `/api/*` | — | 404 `NOT_FOUND` |

Los identificadores se validan (ObjectId de 24 hex y SKU `[A-Za-z0-9._-]{1,80}`) antes de llamar al Server. Las brechas del Server y sus protecciones están en `docs/modules.md`.

No hay proxy universal. Para añadir un endpoint, sigue la receta del punto 10 de `AGENTS.md`.

## Piezas

- `server/utils/upstream.ts`: `rawServerCall` (timeout `NUXT_API_TIMEOUT_MS`, `X-Request-ID`, IP del socket en `X-Forwarded-For`, User-Agent, Accept-Language, `Idempotency-Key` opcional, `redirect: manual`, solo JSON) y `assertOk` (los 5xx se convierten en un mensaje genérico 502; los 4xx conservan el mensaje y el código del Server). También `toBffError`.
- `server/utils/server-api.ts`: `serverApi()`, la llamada autenticada con renovación deduplicada.
- `server/utils/admin-session.ts`: cookies propias (ver `auth.md`).
- `server/utils/session-profile.ts`: valida `/auth/me` y `/auth/permissions` y exige `admin.access`.
- `server/utils/validation.ts`: `readValidatedJson`, que responde 422 con `fieldErrors`.
- `server/middleware/request-guard.ts`: Origin, cuerpo JSON y límite de tamaño. Excepción: multipart solo en `/api/admin/images/*` (ver `modules.md`, punto 53).
- `server/utils/images.ts`: lectura y validación del multipart de imágenes (`readImageUpload`) y reconstrucción para el Server.

## Formato de error hacia el navegador

```json
{ "statusCode": 401, "statusMessage": "SESSION_EXPIRED",
  "data": { "code": "SESSION_EXPIRED", "message": "…", "fieldErrors": { "email": ["…"] }, "requestId": "…" } }
```

El cliente lo normaliza con `toUiError()` (`app/composables/useApiError.ts`).

## Cabeceras

En todas las respuestas: `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: same-origin`, `Content-Security-Policy: frame-ancestors 'none'` y `Permissions-Policy`. En `/api/**` además: `Cache-Control: no-store`. El HTML lleva `noindex`.
