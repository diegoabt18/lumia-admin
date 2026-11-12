# Contratos compartidos

- Origen oficial: `server/shared/contracts/*.ts` (solo tipos: `api`, `catalog`, `feedback`, `financial`, `payments`, `pos`, `sales`).
- Copia local generada: `shared/contracts/`, con el encabezado "GENERADO". **No editar a mano.**
- `npm run contracts:sync` copia, actualiza y elimina obsoletos. Solo lee el Server.
- `npm run contracts:check` sale con código 1 si hay desviaciones. Forma parte de `npm run verify`.
- Ruta alternativa del origen: `SERVER_CONTRACTS_DIR`.

`server/scripts/sync-contracts.mjs` solo sincroniza `lumia` y `lumia2.0`. Para que el Server también empuje a `lumia-admin` basta con agregar `{ name: 'lumia-admin', dir: join(parent, 'lumia-admin', 'shared', 'contracts') }` a sus `targets` y ajustar la comprobación de existencia del proyecto. Es un cambio en el Server que **no se hizo** (pendiente de aprobación); mientras tanto, este repo trae los contratos por su cuenta.

Al momento de la sincronización, `server/shared/` estaba **sin commit** en el repo del Server.

## Endpoints sin contrato oficial

Para respuestas del Server que no tienen tipo en `shared/contracts`, el BFF valida la forma real con Zod y proyecta solo lo necesario:

| Endpoint | Esquema | Fuente en el Server |
|---|---|---|
| `GET /api/auth/me`, `/api/auth/permissions` | `server/utils/session-profile.ts` | `identity/domain/user.entity.ts`, `identity/services/auth.service.ts` |
| `GET /api/admin/dashboard/stats` | `shared/schemas/dashboard.ts` | `admin/services/dashboard.service.ts` |
| `GET /api/admin/meta` | `server/api/admin/environment.get.ts` | `admin/services/admin-meta.service.ts` |

Lo ideal es mover esos tipos a `server/shared/contracts` cuando se apruebe tocar el Server.
