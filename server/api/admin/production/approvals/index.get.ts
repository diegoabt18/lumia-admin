import {
  APPROVAL_STATUSES,
  serverApprovalListSchema,
  serverApprovalSummarySchema,
  type ApprovalList,
  type ApprovalStatus,
} from '#shared/schemas/costing'
import { toAdminPagination } from '#shared/schemas/production'
import { tryLoadProductBySlug } from '../../../../utils/costing'
import { parseUpstream, readListQuery } from '../../../../utils/request-input'
import { serverApi } from '../../../../utils/server-api'
import { toBffError } from '../../../../utils/upstream'

/**
 * GET /api/admin/production/approvals?status= (Server: costing.read).
 * Para pendientes y aprobadas añade el IVA y el precio actual de la variante (products.read; si falta, null).
 */
export default defineEventHandler(async (event): Promise<ApprovalList> => {
  const { page, limit } = readListQuery(event, { allowedLimits: [25, 50, 100], escapeSearch: false })
  const raw = getQuery(event).status
  const status: ApprovalStatus = (APPROVAL_STATUSES as readonly unknown[]).includes(raw) ? (raw as ApprovalStatus) : 'pending'
  try {
    const [listRaw, summaryRaw] = await Promise.all([
      serverApi(event, '/api/admin/production/approvals', { query: { status, page, limit } }),
      serverApi(event, '/api/admin/production/approvals/summary'),
    ])
    const list = parseUpstream(serverApprovalListSchema, listRaw, 'GET /admin/production/approvals')
    const summary = parseUpstream(serverApprovalSummarySchema, summaryRaw, 'GET /admin/production/approvals/summary').data

    const enrich = status === 'pending' || status === 'approved'
    const slugs = enrich ? [...new Set(list.data.map((a) => a.productSlug))] : []
    const products = new Map(await Promise.all(slugs.map(async (slug) => [slug, await tryLoadProductBySlug(event, slug)] as const)))

    return {
      items: list.data.map((a) => {
        const product = products.get(a.productSlug) ?? null
        const variant = product?.variants.find((v) => v.sku === a.variantSku)
        return {
          id: a.id,
          variantSku: a.variantSku,
          productSlug: a.productSlug,
          productName: a.productName?.trim() || product?.name || a.productSlug,
          previousCost: a.previousCost,
          newCost: a.newCost,
          previousPrice: a.previousPrice,
          suggestedPrice: a.suggestedPrice,
          suggestedPriceNet: a.suggestedPriceNet ?? null,
          approvalTaxRate: a.taxRate ?? null,
          priceBasis: a.priceBasis,
          marginPercentage: a.marginPercentage ?? null,
          status: a.status,
          recipeVersion: a.recipeVersion ?? null,
          createdBy: a.createdBy ?? null,
          rejectedReason: a.rejectedReason?.trim() || null,
          createdAt: a.createdAt ?? null,
          publishedAt: a.publishedAt ?? null,
          taxRate: product?.taxRate ?? null,
          currentPrice: variant?.price ?? null,
        }
      }),
      pagination: toAdminPagination(list.meta, limit),
      summary,
    }
  } catch (error) {
    toBffError(error)
  }
})
