# Sistema de diseño

La referencia es Lumia 2.0: `lumia2.0/shared/design-system/tokens.ts`, `tailwind.config.ts`, `docs/DESIGN_SYSTEM.md` y `app/components/ui/*`.

## Tokens (`shared/design-system/tokens.ts`)

| Token | Hex | Uso en el admin |
|---|---|---|
| `lumia-ink` | `#2B2B2B` | Texto, botón primario, ítem activo del menú |
| `lumia-gold` | `#C9A24A` | Eyebrows, iconos de tarjetas, foco, paginación activa |
| `lumia-cream` | `#F6F1E7` | Superficies cálidas (iconos, hover) |
| `lumia-beige` | `#E8DCC8` | Hover secundario, skeletons |
| `lumia-canvas` | `#FAF8F5` | Fondo general |
| `lumia-black` | `#0F0F0F` | Overlays |
| `lumia-success` | `#D6E5DA` | — |
| `status-*` | ver archivo | **Extensión del admin**: danger, warning, info, positive (y `-soft`). Tonos apagados compatibles con la paleta cálida. |
| `chart-bar` | `#A8833A` | **Extensión del admin**: color de las barras de los gráficos. El dorado de la marca tiene 2,4:1 sobre blanco (insuficiente para una marca gráfica); este tono del mismo matiz supera 3:1. Los gráficos tienen vista de tabla. |

La paleta coincide con Lumia 2.0. El Lumia antiguo usaba gold `#C9A27C` y cream `#F5F1EB`; esos valores **no** se adoptaron.

## Tipografía

- Cormorant Garamond (`font-display`): títulos de página, cifras de los indicadores y del diálogo.
- DM Sans (`font-sans`): toda la interfaz.
- Eyebrow (`.lumia-eyebrow`): 11 px, mayúsculas, tracking de 0.2em, dorado. Es el mismo patrón que el layout admin de Lumia 2.0.

## Forma y profundidad

- Controles: `rounded-xl`. Tarjetas: `rounded-2xl`. Pills: `rounded-full`.
- `shadow-soft` en tarjetas y botón primario, `shadow-soft-lg` en menús y diálogos.
- Foco: `outline-lumia-gold/60` (botones) y `ring-lumia-gold/20` (campos).
- Iconos: Tabler, con `stroke-width` 1.5 (decorativos) o 1.75 (acciones).

## Componentes (`app/components/ui`)

| Componente | Base en Lumia 2.0 | Adaptación |
|---|---|---|
| `BaseButton` | `BaseButton` | Variante `danger`, tamaño `sm`, `loading` (bloquea el doble envío), slot de icono |
| `BaseCard` | `BaseCard` | Fondo blanco para datos densos, título/descripción/acciones |
| `AppBreadcrumbs` | `AppBreadcrumbs` | `aria-current`, truncado |
| `AppPagination` | `AppPagination` | Basado en el contrato `AdminPaginationMeta` |
| `BaseInput` + `FormField` | `.lumia-field-input` | Estado inválido (`--invalid`), `aria-invalid`/`aria-describedby`, obligatorio, ayuda |
| `BaseCheckbox`, `BaseBadge`, `BaseSpinner`, `BaseSkeleton` | — | Nuevos, con los mismos tokens |
| `EmptyState`, `ErrorState` | — | Estados vacío y de error (con reintento y referencia de la petición) |
| `ConfirmDialog` + `useConfirm` | — | `alertdialog`, foco inicial en "Cancelar", tono `danger` |
| `DataTable`, `TableToolbar` + `useTableQuery` | — | Orden, búsqueda con debounce, filtros por slot, acciones por fila, skeleton, vacío, error, tarjetas en móvil |

## Layout

- Sidebar de 256 px (blanco translúcido) con grupos y un ítem activo en `lumia-ink`. Los módulos aún no construidos aparecen con "Pronto". En móvil es un drawer.
- Topbar sticky con migas, insignia de entorno y menú de usuario (cerrar sesión con confirmación).
- Contenido con `max-w-content` (1280 px) y `PageHeader` (eyebrow, título display, descripción y acciones).
- Notificaciones: vue-sonner (`top-right`, `rich-colors`), como en Lumia 2.0.
