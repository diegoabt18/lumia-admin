import { serverDashboardStatsSchema, type DashboardListItem, type DashboardStats } from '#shared/schemas/dashboard'
import { serverApi } from '../../utils/server-api'
import { toBffError, UpstreamError } from '../../utils/upstream'

/** Proxy explícito de GET /api/admin/dashboard/stats (Server: adminGuard admin.access). */
export default defineEventHandler(async (event): Promise<DashboardStats> => {
  try {
    const parsed = serverDashboardStatsSchema.safeParse(await serverApi(event, '/api/admin/dashboard/stats'))
    if (!parsed.success) {
      console.error('[bff] dashboard/stats con forma inesperada', parsed.error.flatten())
      throw new UpstreamError(502, 'UPSTREAM_INVALID_RESPONSE', 'El servidor devolvió estadísticas con un formato inesperado.')
    }
    const stats = parsed.data

    const item = (
      key: string | undefined,
      label: string | undefined,
      detail: string | null,
      value: number | null = null,
    ): DashboardListItem | null => (key || label ? { key: key ?? label!, label: label ?? key!, detail, value } : null)
    const compact = <T>(rows: (T | null)[]): T[] => rows.filter((row): row is T => row !== null)

    return {
      counts: {
        products: stats.productCount,
        activeProducts: stats.activeProductCount,
        orders: stats.orderCount,
        paidSalesTotal: stats.totalSales,
        activePromotions: stats.activePromotions,
        staff: stats.staffCount,
        activeSessions: stats.activeSessions,
      },
      topSelling: compact(
        stats.top.selling.map((p) => item(p.slug, p.name, null, p.sales_total_units ?? null)),
      ),
      alerts: {
        outOfStock: compact(stats.alerts.outOfStockProducts.map((p) => item(p._id ?? p.slug, p.name, null))),
        emptyCategories: compact(stats.alerts.emptyCategories.map((c) => item(c.slug, c.name, null))),
        promotionsExpiringSoon: compact(
          stats.alerts.promotionsExpiringSoon.map((p) => {
            const endsAt = p.ends_at ? new Date(p.ends_at) : null
            const label = p.name ?? p.title
            return item(label, label, endsAt && !Number.isNaN(endsAt.getTime()) ? endsAt.toISOString() : null)
          }),
        ),
      },
    }
  } catch (error) {
    toBffError(error)
  }
})
