# Permisos y navegación

- Fuente de verdad: `server/src/common/permissions/registry.ts` (73 permisos y el comodín `*`).
- Espejo local: `shared/auth/permissions.ts`. `npm run permissions:check` falla si difiere del Server.
- Permisos efectivos del usuario: `GET /api/auth/permissions` (RBAC dinámico: roles, overrides, temporales, delegaciones).
- `hasPermission()` replica la semántica del Server: permiso exacto o `*`.
- La interfaz **solo oculta**. El Server autoriza cada endpoint con `adminGuard(sessions, permiso)`, que exige `admin.access` y el permiso concreto.

## Módulos y el permiso que el Server exige (verificado en `server/src/routes`)

| Módulo | Lectura | Escritura | Observación |
|---|---|---|---|
| Dashboard | `admin.access` | — | ✅ implementado |
| Analítica | `analytics.read` | — | ✅ implementado |
| Pedidos | `orders.read` | `orders.update` | ✅ implementado |
| Productos | `products.read` | `products.create/update/delete` | ✅ implementado |
| Inventario | `inventory.read` | `inventory.update` (también el ajuste de stock desde la ficha del producto) | ✅ implementado · permisos propios desde 2026-11 |
| Categorías | `categories.read` | `categories.create/update/delete` | ✅ implementado |
| Promociones | `promotions.read` | `promotions.create/update/delete` (pausar y reanudar = `update`) | ✅ implementado · permisos propios desde 2026-11 |
| Banners | `banners.read` | `banners.create/update/delete` | ✅ implementado · permisos propios desde 2026-11 |
| Imágenes | — | `products.update` (materiales: `materials.update`) | ✅ implementado (generación; el Server no publica) |
| Configuración de tienda | `store.settings.read` | Envíos, moneda y atención: `store.settings.manage` · **Pagos: `store.payments.manage`** | ✅ implementado · sin el permiso de escritura los formularios se muestran en solo lectura |
| Reseñas y preguntas | `feedback.read` | `feedback.moderate` (ocultar o mostrar) | ✅ implementado (solo reportes) · permisos propios desde 2026-11 |
| Producción y costeo | `materials.read`, `suppliers.read`, `units.read`, `recipes.read`, `costing.read`… | `*.create/update/delete`, `costing.manage`, `production.config.manage` | ✅ recetas, precios, aprobaciones, materiales, proveedores y unidades · impacto, configuración y equivalencias pendientes. Se muestra con cualquiera de los de lectura |
| Usuarios | `admin.users.read` | `admin.users.manage` | ✅ implementado · asignar roles exige también `admin.roles.read` (ver `modules.md`, puntos 31 a 36) |
| Roles y permisos | `admin.roles.read` | `admin.roles.manage` | ✅ implementado (roles) · el catálogo de permisos sale del espejo verificado, no de `admin.permissions.*` |
| Auditoría | `admin.audit.read` | — | ✅ implementado · el Server registra las escrituras administrativas en `admin_activity_audit` (cadena HMAC) desde 2026-11 |
| **Contabilidad** | — | — | ❌ El Server no tiene permisos ni endpoints. No aparece en el menú. |

## Brechas que hay que resolver en el Server (no simuladas aquí)

1. Faltan `accounting.*` para el futuro módulo contable.
2. ~~Promociones, banners, configuración de tienda y feedback no tienen permisos propios.~~ **Resuelto (2026-11)**: ver la tabla y la sección de migración.
3. No hay permiso de POS: el POS de Lumia 2.0 usa `orders.create` y `orders.update`.

## Migración de los permisos por módulo (2026-11)

Los módulos de la tabla que antes usaban `admin.access` o `products.*` exigen ahora sus propios permisos. Para que nadie pierda acceso al desplegar:

1. **Catálogo:** después de desplegar el Server, sincroniza el catálogo de permisos con `POST /api/admin/security/permissions/sync`. Solo inserta los que faltan. `GET /api/admin/security/permissions/health` muestra los pendientes.
2. **Simulación:** en el Server, `npm run db:migrate-module-permissions` muestra qué permisos añadiría a cada rol, plantilla, permiso temporal, override y permiso condicional. No escribe nada.
3. **Aplicar:** elige qué hacer con lo que hoy concede `admin.access`:
   - `-- --apply --admin-access=preserve` mantiene el acceso actual. Todo rol con `admin.access` recibe ajustes de tienda, **pagos** y moderación. Después conviene quitárselos a quien no los necesite.
   - `-- --apply --admin-access=skip` no concede esos permisos. Solo `*` (superadministrador) y quien los reciba a mano podrán ver o cambiar ajustes y moderar.

   En ambos modos, quien tenía `products.read` o `products.update` recibe los permisos equivalentes de promociones, banners e inventario.
4. **Garantías del script:** nunca quita permisos y es idempotente. Los permisos efectivos en caché se renuevan en 5 minutos como máximo.

Entre el despliegue del Server y la migración, los roles sin `*` no tendrán acceso a esos módulos.
