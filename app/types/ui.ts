import type { PermissionId } from '#shared/auth/permissions'

export interface Crumb {
  label: string
  to?: string
}

export type SortDirection = 'asc' | 'desc'

export interface SortState {
  key: string
  direction: SortDirection
}

export interface TableColumn {
  key: string
  label: string
  sortable?: boolean
  align?: 'left' | 'right' | 'center'
  /** Clases extra para la celda (ancho, tabular-nums, etc.). */
  class?: string
  /** Oculta la columna en la vista de tarjetas móviles. */
  hideOnMobile?: boolean
}

export interface NavItem {
  label: string
  to: string
  icon: unknown
  /** Basta con uno de estos permisos para ver la opción (semántica de hasPermission del Server). */
  anyOf: readonly PermissionId[]
  /** false = módulo aún no construido en Lumia Admin (se muestra como "En preparación"). */
  available: boolean
}

/** Registro de inventario a ajustar en StockAdjustDialog. */
export interface DepositPolicyTarget {
  sku: string
  label?: string | null
  isPerOrder: boolean
  depositPolicy: import('#shared/schemas/inventory').DepositPolicyView | null
}

export interface StockTarget {
  sku: string
  label?: string | null
  quantity: number
  reserved: number
  isPerOrder: boolean
  /** Endpoint del BFF que guarda el valor (PUT). */
  endpoint: `/api/${string}`
}

export interface NavGroup {
  label: string
  items: readonly NavItem[]
}
