import {
  ANALYTICS_PERIODS,
  growth,
  serverOverviewSchema,
  serverSalesSchema,
  SOLD_STATUSES,
  type AnalyticsPeriod,
  type AnalyticsReport,
} from '#shared/schemas/analytics'
import { parseUpstream } from '../../utils/request-input'
import { serverApi } from '../../utils/server-api'
import { toBffError } from '../../utils/upstream'

const isPeriod = (v: unknown): v is AnalyticsPeriod => (ANALYTICS_PERIODS as readonly unknown[]).includes(v)

/**
 * GET /api/admin/analytics?period=7d|30d|90d|1y
 * (Server: analytics.read → /admin/analytics/overview + /admin/analytics/sales).
 * Correcciones sobre los cálculos del Server documentadas en shared/schemas/analytics.ts.
 */
export default defineEventHandler(async (event): Promise<AnalyticsReport> => {
  const raw = getQuery(event).period
  const period: AnalyticsPeriod = isPeriod(raw) ? raw : '30d'
  try {
    const [overviewRaw, salesRaw] = await Promise.all([
      serverApi(event, '/api/admin/analytics/overview', { query: { period } }),
      serverApi(event, '/api/admin/analytics/sales', { query: { period } }),
    ])
    const overview = parseUpstream(serverOverviewSchema, overviewRaw, 'GET /admin/analytics/overview')
    const sales = parseUpstream(serverSalesSchema, salesRaw, 'GET /admin/analytics/sales')

    const soldOrders = sales.orders.byStatus
      .filter((s) => (SOLD_STATUSES as readonly string[]).includes(s.status))
      .reduce((sum, s) => sum + s.count, 0)
    const revenue = overview.revenue.current

    const cmp = (c: { current: number; previous: number }) => ({ ...c, growth: growth(c.current, c.previous) })

    return {
      period,
      from: overview.period.from ?? null,
      to: overview.period.to ?? null,
      previousFrom: overview.previous.from ?? null,
      revenue: cmp(overview.revenue),
      orders: cmp(overview.orders),
      newAccounts: cmp(overview.newCustomers),
      soldOrders,
      averageTicket: soldOrders > 0 ? Math.round(revenue / soldOrders) : null,
      refundsTotal: sales.refunds.total,
      topProducts: overview.topProducts.slice(0, 10),
      revenueByDay: overview.revenueByDay,
      ordersByStatus: [...sales.orders.byStatus].sort((a, b) => b.count - a.count),
      ordersByPaymentMethod: [...sales.revenue.byPaymentMethod].sort((a, b) => b.count - a.count),
    }
  } catch (error) {
    toBffError(error)
  }
})
