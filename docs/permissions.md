# Permisos y navegación

- Fuente de verdad: `server/src/common/permissions/registry.ts` (56 permisos y el comodín `*`).
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
| Inventario | `products.read` | `products.update` | ✅ implementado · no hay permiso específico de inventario |
| Categorías | `categories.read` | `categories.create/update/delete` | ✅ implementado |
| Promociones y banners | `products.read` | `products.update` | ✅ implementado · ⚠️ el Server reutiliza permisos de productos |
| Imágenes | — | `products.update` (materiales: `materials.update`) | ✅ implementado (generación; el Server no publica) |
| Configuración de tienda | `admin.access` | `admin.access` | ✅ implementado · ⚠️ cualquier admin puede cambiar envíos y pagos |
| Reseñas y preguntas | `admin.access` | `admin.access` | ✅ implementado (solo reportes) · ⚠️ sin permiso específico |
| Producción y costeo | `materials.read`, `suppliers.read`, `units.read`, `recipes.read`, `costing.read`… | `*.create/update/delete`, `costing.manage`, `production.config.manage` | ✅ recetas, precios, aprobaciones, materiales, proveedores y unidades · impacto, configuración y equivalencias pendientes. Se muestra con cualquiera de los de lectura |
| Usuarios | `admin.users.read` | `admin.users.manage` | ✅ implementado · asignar roles exige también `admin.roles.read` (ver `modules.md`, puntos 31 a 36) |
| Roles y permisos | `admin.roles.read` | `admin.roles.manage` | ✅ implementado (roles) · el catálogo de permisos sale del espejo verificado, no de `admin.permissions.*` |
| Auditoría | `admin.audit.read` | — | ✅ implementado · ⚠️ el Server no registra las escrituras administrativas (ver `modules.md`, punto 43) |
| **Contabilidad** | — | — | ❌ El Server no tiene permisos ni endpoints. No aparece en el menú. |

## Brechas que hay que resolver en el Server (no simuladas aquí)

1. Faltan `accounting.*` para el futuro módulo contable.
2. Promociones, banners, configuración de tienda y feedback no tienen permisos propios. Con el registro actual, no se puede dar "solo pedidos" sin abrir configuración de tienda a quien tenga `admin.access`.
3. No hay permiso de POS: el POS de Lumia 2.0 usa `orders.create` y `orders.update`.
