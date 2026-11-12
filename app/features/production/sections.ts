import { PERMISSIONS, type PermissionId } from '#shared/auth/permissions'

/** Secciones de Producción construidas en Lumia Admin, con el permiso de lectura que exige el Server. */
export const PRODUCTION_SECTIONS: readonly { label: string; to: string; permission: PermissionId }[] = [
  { label: 'Recetas', to: '/production/recipes', permission: PERMISSIONS.RECIPES_READ },
  { label: 'Precios', to: '/production/pricing', permission: PERMISSIONS.RECIPES_READ },
  { label: 'Aprobaciones', to: '/production/approvals', permission: PERMISSIONS.COSTING_READ },
  { label: 'Materiales', to: '/production/materials', permission: PERMISSIONS.MATERIALS_READ },
  { label: 'Proveedores', to: '/production/suppliers', permission: PERMISSIONS.SUPPLIERS_READ },
  { label: 'Unidades', to: '/production/units', permission: PERMISSIONS.UNITS_READ },
]
