import { z } from 'zod'
import { isoDate } from './common'

/**
 * Analítica. Fuente en el Server (analytics.read):
 * - GET /admin/analytics/overview y /admin/analytics/sales → AdminAnalyticsService.
 * - "Vendido" = pedidos con estado paid, shipped o delivered (online y POS juntos), por fecha de creación.
 * - Los días de `revenueByDay` se agrupan por fecha UTC, no por la hora de la tienda.
 * - `aov` del Server divide ingresos de pedidos vendidos entre TODOS los pedidos (incluye pendientes y
 *   cancelados): no se usa. El BFF calcula el ticket promedio con los pedidos vendidos.
 * - `newCustomers` cuenta todas las cuentas creadas (también personal).
 * - `growth` del Server da 100 % cuando el periodo anterior es 0: el BFF lo recalcula (null).
 */

export const ANALYTICS_PERIODS = ['7d', '30d', '90d', '1y'] as const
export type AnalyticsPeriod = (typeof ANALYTICS_PERIODS)[number]

export const ANALYTICS_PERIOD_LABELS: Record<AnalyticsPeriod, string> = {
  '7d': '7 días',
  '30d': '30 días',
  '90d': '90 días',
  '1y': '12 meses',
}

export const SOLD_STATUSES = ['paid', 'shipped', 'delivered'] as const

const comparison = z.object({ current: z.number(), previous: z.number() })
const range = z.object({ from: isoDate, to: isoDate })

export const serverOverviewSchema = z.object({
  period: range,
  previous: range,
  revenue: comparison,
  orders: comparison,
  newCustomers: comparison,
  topProducts: z.array(z.object({ slug: z.string(), name: z.string(), revenue: z.number(), units: z.number() })),
  revenueByDay: z.array(z.object({ date: z.string(), revenue: z.number(), orders: z.number() })),
})

export const serverSalesSchema = z.object({
  revenue: z.object({
    byPaymentMethod: z.array(z.object({ method: z.string(), count: z.number().int().min(0) })),
  }),
  orders: z.object({
    total: z.number().int().min(0),
    byStatus: z.array(z.object({ status: z.string(), count: z.number().int().min(0) })),
  }),
  refunds: z.object({ total: z.number() }),
})

export interface Comparison {
  current: number
  previous: number
  /** Variación en % redondeada; null si el periodo anterior es 0. */
  growth: number | null
}

export interface AnalyticsReport {
  period: AnalyticsPeriod
  from: string | null
  to: string | null
  previousFrom: string | null
  revenue: Comparison
  orders: Comparison
  newAccounts: Comparison
  /** Pedidos vendidos (paid, shipped, delivered) del periodo actual. */
  soldOrders: number
  /** Ingresos / pedidos vendidos del periodo actual; null si no hay ventas. */
  averageTicket: number | null
  refundsTotal: number
  topProducts: { slug: string; name: string; revenue: number; units: number }[]
  revenueByDay: { date: string; revenue: number; orders: number }[]
  ordersByStatus: { status: string; count: number }[]
  ordersByPaymentMethod: { method: string; count: number }[]
}

export const PAYMENT_METHOD_LABELS: Record<string, string> = {
  mercadopago: 'Mercado Pago',
  manual: 'Pago acordado',
  cash: 'Efectivo',
  bank_transfer: 'Transferencia',
  unknown: 'Sin método',
}

export function growth(current: number, previous: number): number | null {
  if (previous === 0) return null
  return Math.round(((current - previous) / previous) * 100)
}
