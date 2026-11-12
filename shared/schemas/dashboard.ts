import { z } from 'zod'

/**
 * Proyección validada de GET /api/admin/dashboard/stats del Server
 * (server/src/modules/admin/services/dashboard.service.ts → getStats()).
 *
 * El Server no publica este contrato en shared/contracts; el BFF valida la forma real y
 * conserva solo lo que la interfaz muestra. Si el Server cambia la respuesta, el BFF
 * responde 502 en lugar de mostrar datos mal interpretados.
 */

const count = z.number().finite().nonnegative()
const optionalText = z.string().trim().min(1).optional().catch(undefined)

const productRef = z.object({
  slug: optionalText,
  _id: optionalText,
  name: optionalText,
  sales_total_units: z.number().finite().optional().catch(undefined),
  favorites: z.number().finite().optional().catch(undefined),
  available: z.number().finite().optional().catch(undefined),
})

const categoryRef = z.object({ slug: optionalText, name: optionalText })

const promotionRef = z.object({
  name: optionalText,
  title: optionalText,
  ends_at: z.union([z.string(), z.date()]).optional().catch(undefined),
})

export const serverDashboardStatsSchema = z.object({
  staffCount: count,
  productCount: count,
  activeProductCount: count,
  orderCount: count,
  totalSales: z.number().finite(),
  activeSessions: count,
  activePromotions: count,
  usersWithFavorites: count,
  top: z.object({
    selling: z.array(productRef),
    popular: z.array(productRef),
    favorited: z.array(productRef),
  }),
  alerts: z.object({
    promotionsExpiringSoon: z.array(promotionRef),
    outOfStockProducts: z.array(productRef),
    emptyCategories: z.array(categoryRef),
  }),
})

export interface DashboardListItem {
  key: string
  label: string
  /** Texto secundario (p. ej. fecha ISO de vencimiento). */
  detail: string | null
  /** Valor numérico asociado (p. ej. unidades vendidas). */
  value: number | null
}

export interface DashboardStats {
  counts: {
    products: number
    activeProducts: number
    orders: number
    paidSalesTotal: number
    activePromotions: number
    staff: number
    activeSessions: number
  }
  topSelling: DashboardListItem[]
  alerts: {
    outOfStock: DashboardListItem[]
    emptyCategories: DashboardListItem[]
    promotionsExpiringSoon: DashboardListItem[]
  }
}
