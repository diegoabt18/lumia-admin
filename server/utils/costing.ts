import type { H3Event } from 'h3'
import {
  serverApprovalListSchema,
  serverPricingProductDetailSchema,
  type ApprovalStatus,
  type PricingProductDetail,
  type ServerApproval,
} from '#shared/schemas/costing'
import { SLUG_PATTERN } from '#shared/schemas/common'
import { variantLabel } from '#shared/schemas/products'
import { serverRecipeEnvelopeSchema } from '#shared/schemas/recipes'
import { parseUpstream } from './request-input'
import { serverApi } from './server-api'
import { throwBffError, UpstreamError } from './upstream'

/** Producto con los datos de producción de sus variantes. Acepta id o slug (el Server resuelve ambos). */
export async function loadPricingProduct(event: H3Event, idOrSlug: string): Promise<PricingProductDetail> {
  const data = parseUpstream(
    serverPricingProductDetailSchema,
    await serverApi(event, `/api/admin/products/${encodeURIComponent(idOrSlug)}`),
    'GET /admin/products/:id',
  )
  return {
    id: data.product.id,
    name: data.product.name,
    slug: data.product.slug,
    taxRate: data.product.taxRate,
    recipeId: data.product.productionRecipeId ?? null,
    variants: data.variants.map((v) => ({
      sku: v.sku,
      label: variantLabel(v.options),
      price: v.price,
      recipeId: v.productionRecipeId ?? null,
      pricingStatus: v.pricing_status ?? null,
      costStatus: v.cost_status ?? null,
      lastSuggestedPrice: v.suggested_price ?? null,
    })),
  }
}

/** Para mostrar IVA y precio actual en las aprobaciones. Sin permiso de productos devuelve null. */
export async function tryLoadProductBySlug(event: H3Event, slug: string): Promise<PricingProductDetail | null> {
  if (!SLUG_PATTERN.test(slug)) return null
  try {
    return await loadPricingProduct(event, slug)
  } catch (error) {
    if (error instanceof UpstreamError && (error.statusCode === 403 || error.statusCode === 404)) return null
    throw error
  }
}

/** Solo se asignan recetas existentes y activas (el Server acepta también inactivas). */
export async function assertRecipeAssignable(event: H3Event, recipeId: string) {
  const { data } = parseUpstream(
    serverRecipeEnvelopeSchema,
    await serverApi(event, `/api/admin/production/recipes/${recipeId}`),
    'GET /admin/production/recipes/:id',
  )
  if (!data.isActive) {
    throwBffError(409, { code: 'RECIPE_INACTIVE', message: 'La receta está inactiva: actívala antes de asignarla.' })
  }
}

/**
 * El Server no tiene GET de una solicitud por id: se busca en el listado de ese estado
 * (páginas de 100, hasta 2 000 solicitudes).
 */
export async function findApproval(event: H3Event, id: string, status: ApprovalStatus): Promise<ServerApproval> {
  for (let page = 1; page <= 20; page++) {
    const data = parseUpstream(
      serverApprovalListSchema,
      await serverApi(event, '/api/admin/production/approvals', { query: { status, page, limit: 100 } }),
      'GET /admin/production/approvals',
    )
    const found = data.data.find((a) => a.id === id)
    if (found) return found
    if (page >= data.meta.totalPages) break
  }
  throwBffError(404, {
    code: 'APPROVAL_NOT_FOUND',
    message: 'La solicitud no existe o cambió de estado. Recarga la lista.',
  })
}
