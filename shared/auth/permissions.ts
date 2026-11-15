/**
 * Espejo de los identificadores de permiso del Server.
 * Fuente de verdad: server/src/common/permissions/registry.ts (PERMISSION_REGISTRY).
 *
 * No agregues permisos aquí que no existan en el Server: `npm run permissions:check`
 * compara este archivo con el registro real y falla si hay diferencias.
 *
 * Estos permisos solo se usan para OCULTAR opciones en la interfaz.
 * La autorización real la decide el Server en cada endpoint (adminGuard).
 */
export const PERMISSIONS = {
  ACCOUNT_READ: 'account.read',
  PAGE_CART: 'page.cart',
  CART_READ: 'cart.read',
  CART_WRITE: 'cart.write',
  ORDERS_READ: 'orders.read',
  ORDERS_CREATE: 'orders.create',
  ORDERS_UPDATE: 'orders.update',
  ORDERS_DELETE: 'orders.delete',
  PAYMENTS_CREATE: 'payments.create',
  PAYMENTS_REFUND: 'payments.refund',
  PRODUCTS_READ: 'products.read',
  PRODUCTS_CREATE: 'products.create',
  PRODUCTS_UPDATE: 'products.update',
  PRODUCTS_DELETE: 'products.delete',
  CATEGORIES_READ: 'categories.read',
  CATEGORIES_CREATE: 'categories.create',
  CATEGORIES_UPDATE: 'categories.update',
  CATEGORIES_DELETE: 'categories.delete',
  ADMIN_ACCESS: 'admin.access',
  ADMIN_SECURITY: 'admin.security',
  ADMIN_SECURITY_VIEW: 'admin.security.view',
  ADMIN_SECURITY_MANAGE: 'admin.security.manage',
  ADMIN_ROLES_READ: 'admin.roles.read',
  ADMIN_ROLES_MANAGE: 'admin.roles.manage',
  ADMIN_USERS_READ: 'admin.users.read',
  ADMIN_USERS_MANAGE: 'admin.users.manage',
  ADMIN_AUDIT_READ: 'admin.audit.read',
  ADMIN_SESSIONS_READ: 'admin.sessions.read',
  ADMIN_SESSIONS_REVOKE: 'admin.sessions.revoke',
  ADMIN_PERMISSIONS_READ: 'admin.permissions.read',
  ADMIN_PERMISSIONS_MANAGE: 'admin.permissions.manage',
  ANALYTICS_READ: 'analytics.read',
  MATERIALS_READ: 'materials.read',
  MATERIALS_CREATE: 'materials.create',
  MATERIALS_UPDATE: 'materials.update',
  MATERIALS_DELETE: 'materials.delete',
  SUPPLIERS_READ: 'suppliers.read',
  SUPPLIERS_CREATE: 'suppliers.create',
  SUPPLIERS_UPDATE: 'suppliers.update',
  SUPPLIERS_DELETE: 'suppliers.delete',
  RECIPES_READ: 'recipes.read',
  RECIPES_CREATE: 'recipes.create',
  RECIPES_UPDATE: 'recipes.update',
  RECIPES_DELETE: 'recipes.delete',
  COSTING_READ: 'costing.read',
  COSTING_MANAGE: 'costing.manage',
  PRODUCTION_CONFIG_READ: 'production.config.read',
  PRODUCTION_CONFIG_MANAGE: 'production.config.manage',
  UNITS_READ: 'units.read',
  UNITS_CREATE: 'units.create',
  UNITS_UPDATE: 'units.update',
  UNITS_DELETE: 'units.delete',
  EQUIVALENCES_READ: 'equivalences.read',
  EQUIVALENCES_CREATE: 'equivalences.create',
  EQUIVALENCES_UPDATE: 'equivalences.update',
  EQUIVALENCES_DELETE: 'equivalences.delete',
  LUMI_USE: 'lumi.use',
  LUMI_WEB: 'lumi.web',
  LUMI_CAPABILITIES_READ: 'lumi.capabilities.read',
  LUMI_CAPABILITIES_MANAGE: 'lumi.capabilities.manage',
  LUMI_CAPABILITIES_TEST: 'lumi.capabilities.test',
  LUMI_CAPABILITIES_ENABLE: 'lumi.capabilities.enable',
  LUMI_LEARNING_READ: 'lumi.learning.read',
  LUMI_LEARNING_MANAGE: 'lumi.learning.manage',
  STORE_SETTINGS_READ: 'store.settings.read',
  STORE_SETTINGS_MANAGE: 'store.settings.manage',
  STORE_PAYMENTS_MANAGE: 'store.payments.manage',
  PROMOTIONS_READ: 'promotions.read',
  PROMOTIONS_CREATE: 'promotions.create',
  PROMOTIONS_UPDATE: 'promotions.update',
  PROMOTIONS_DELETE: 'promotions.delete',
  BANNERS_READ: 'banners.read',
  BANNERS_CREATE: 'banners.create',
  BANNERS_UPDATE: 'banners.update',
  BANNERS_DELETE: 'banners.delete',
  FEEDBACK_READ: 'feedback.read',
  FEEDBACK_MODERATE: 'feedback.moderate',
  INVENTORY_READ: 'inventory.read',
  INVENTORY_UPDATE: 'inventory.update',
} as const

export type PermissionId = (typeof PERMISSIONS)[keyof typeof PERMISSIONS]

/** Comodín que el Server interpreta como "todos los permisos" (PERMISSION_WILDCARD). */
export const PERMISSION_WILDCARD = '*'

const KNOWN = new Set<string>(Object.values(PERMISSIONS))

export function isPermissionId(value: unknown): value is PermissionId {
  return typeof value === 'string' && KNOWN.has(value)
}

/** Misma semántica que hasPermission() del Server: permiso exacto o comodín. */
export function hasPermission(granted: readonly string[], required: PermissionId): boolean {
  return granted.includes(required) || granted.includes(PERMISSION_WILDCARD)
}

/** Lista efectiva saneada: solo permisos conocidos y el comodín. */
export function sanitizePermissions(values: readonly unknown[]): string[] {
  const out = new Set<string>()
  for (const value of values) {
    if (value === PERMISSION_WILDCARD || isPermissionId(value)) out.add(value as string)
  }
  return [...out].sort()
}
