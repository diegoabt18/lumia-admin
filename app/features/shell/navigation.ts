import {
  IconAdjustmentsHorizontal,
  IconBoxSeam,
  IconCategory,
  IconChartBar,
  IconClipboardList,
  IconFlask,
  IconLayoutDashboard,
  IconMessageCircle,
  IconPackages,
  IconPhoto,
  IconRosetteDiscount,
  IconShieldLock,
  IconSlideshow,
  IconUsers,
  IconHistory,
} from '@tabler/icons-vue'
import { PERMISSIONS } from '#shared/auth/permissions'
import type { NavGroup } from '~/types/ui'

/**
 * Mapa de módulos del admin.
 *
 * Cada `anyOf` usa el permiso que el Server exige en el endpoint de lectura del módulo
 * (verificado en server/src/routes/*.routes.ts). No se inventan permisos: los módulos que en
 * el Server solo exigen `admin.access` (tienda, feedback) usan ese permiso, y Contabilidad no
 * aparece porque el Server todavía no define permisos ni endpoints para ella (ver docs/permissions.md).
 *
 * `available: false` = módulo pendiente de construir en Lumia Admin.
 */
export const NAVIGATION: readonly NavGroup[] = [
  {
    label: 'General',
    items: [
      { label: 'Dashboard', to: '/dashboard', icon: IconLayoutDashboard, anyOf: [PERMISSIONS.ADMIN_ACCESS], available: true },
      { label: 'Analítica', to: '/analytics', icon: IconChartBar, anyOf: [PERMISSIONS.ANALYTICS_READ], available: true },
    ],
  },
  {
    label: 'Ventas',
    items: [
      { label: 'Pedidos', to: '/orders', icon: IconClipboardList, anyOf: [PERMISSIONS.ORDERS_READ], available: true },
    ],
  },
  {
    label: 'Catálogo',
    items: [
      { label: 'Productos', to: '/products', icon: IconBoxSeam, anyOf: [PERMISSIONS.PRODUCTS_READ], available: true },
      { label: 'Inventario', to: '/inventory', icon: IconPackages, anyOf: [PERMISSIONS.PRODUCTS_READ], available: true },
      { label: 'Categorías', to: '/categories', icon: IconCategory, anyOf: [PERMISSIONS.CATEGORIES_READ], available: true },
      { label: 'Promociones', to: '/promotions', icon: IconRosetteDiscount, anyOf: [PERMISSIONS.PRODUCTS_READ], available: true },
      { label: 'Banners', to: '/banners', icon: IconSlideshow, anyOf: [PERMISSIONS.PRODUCTS_READ], available: true },
      { label: 'Imágenes', to: '/images', icon: IconPhoto, anyOf: [PERMISSIONS.PRODUCTS_UPDATE, PERMISSIONS.MATERIALS_UPDATE], available: true },
    ],
  },
  {
    label: 'Tienda',
    items: [
      { label: 'Configuración', to: '/store-settings', icon: IconAdjustmentsHorizontal, anyOf: [PERMISSIONS.ADMIN_ACCESS], available: true },
      { label: 'Reseñas y preguntas', to: '/feedback', icon: IconMessageCircle, anyOf: [PERMISSIONS.ADMIN_ACCESS], available: true },
    ],
  },
  {
    label: 'Producción',
    items: [
      {
        label: 'Producción y costeo',
        to: '/production',
        icon: IconFlask,
        anyOf: [PERMISSIONS.MATERIALS_READ, PERMISSIONS.SUPPLIERS_READ, PERMISSIONS.UNITS_READ, PERMISSIONS.RECIPES_READ, PERMISSIONS.COSTING_READ],
        available: true,
      },
    ],
  },
  {
    label: 'Administración',
    items: [
      { label: 'Usuarios', to: '/users', icon: IconUsers, anyOf: [PERMISSIONS.ADMIN_USERS_READ], available: true },
      { label: 'Roles y permisos', to: '/roles', icon: IconShieldLock, anyOf: [PERMISSIONS.ADMIN_ROLES_READ], available: true },
      { label: 'Auditoría', to: '/audit-log', icon: IconHistory, anyOf: [PERMISSIONS.ADMIN_AUDIT_READ], available: true },
    ],
  },
]
