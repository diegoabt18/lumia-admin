# Lumia Admin

Aplicación administrativa interna del ecosistema Lumia. Es independiente de Lumia 2.0 (tienda y POS) y consume el Server Fastify a través de un BFF Nitro propio.

```
Navegador → Lumia Admin (SPA + Nitro /api/*) → Server Fastify → MongoDB
```

## Requisitos

- Node ≥ 24.11 (verificado con 24.18) y npm 11.
- El Server corriendo y accesible (por defecto en `:3001`).
- Una cuenta con `admin.access` y login local habilitado en el Server (`AUTH_LOCAL_ENABLED=true`).

## Desarrollo

```bash
cp .env.example .env
# fuera de Docker: NUXT_API_BASE_URL=http://127.0.0.1:3001
npm install
npm run dev            # http://localhost:3100
```

## Verificación

```bash
npm run verify         # contracts:check + permissions:check + typecheck + build
```

## Docker

```bash
docker compose up -d --build   # requiere la red server_lumia-network del Server
```

Ver `docs/docker.md`.

## Documentación

- `AGENTS.md`: reglas de ingeniería del proyecto.
- `docs/auth.md`: sesiones, 2FA, renovación, CSRF y la propuesta para Google OAuth.
- `docs/bff.md`: endpoints del BFF y su correspondencia con el Server.
- `docs/permissions.md`: permisos por módulo y brechas del Server.
- `docs/contracts.md`: sincronización de contratos.
- `docs/docker.md`: red, servicios y entornos de datos.
- `docs/design-system.md`: tokens y componentes.
- `docs/modules.md`: módulos implementados y brechas del Server.

## Estado

Etapa 1: shell, autenticación (login local + 2FA), navegación por permisos y dashboard.
Etapa 2: categorías, productos, inventario y pedidos (ver `docs/modules.md`).

Etapa 3: gestión de variantes y anticipos de pedidos.

Etapa 4: promociones y banners.

Etapa 5: configuración de tienda (envíos, pagos, moneda, atención al cliente).

Etapa 6: reseñas y preguntas (reportes de clientes; ocultar o mostrar reseñas y preguntas).

Etapa 7: usuarios (listado, detalle con permisos efectivos, asignación de roles con control de escalada).

Etapa 8: roles y permisos (crear, duplicar, editar permisos, archivar, restaurar, eliminar; sin escalada).

Etapa 9: auditoría (accesos y cambios de permisos, con filtros por evento y fechas).

Etapa 10: analítica (ventas, pedidos, ticket promedio, productos más vendidos; cifras corregidas en el BFF).

Etapa 11: imágenes (generación AVIF + WebP de producto, sitio y material; descarga en ZIP).

Etapa 12: producción, base (materiales con proveedores e historial de precios, proveedores, unidades).

Etapa 13: recetas (materiales, costos indirectos, margen, cálculo de costo, versiones).

Etapa 14: costeo y precios (asignación de recetas, envío a aprobación, aprobar, rechazar y publicar con controles de IVA y precio cambiado).

Server: precio sugerido con el IVA del producto (`docs/proposals/server-iva-precio-sugerido.md`, aplicada).

Siguientes (el Server ya tiene endpoints): impacto de costos, configuración de producción, equivalencias e indirectos globales. Contabilidad depende de que el Server defina permisos y endpoints. Las protecciones que hoy aplica el BFF deberían pasar al Server (`docs/modules.md`).
