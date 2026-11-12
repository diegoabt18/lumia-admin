import { z } from 'zod'
import type { AdminPaginationMeta } from '../contracts/api'
import { isoDate, OBJECT_ID_PATTERN } from './common'

/**
 * Costeo y publicación de precios. Fuente en el Server:
 * - Productos con receta: GET /admin/production/recipes/products (recipes.read) → RecipeService.listProducts
 * - Asignación: POST/DELETE /admin/products/:id/recipe (recipes.update),
 *   PATCH /admin/products/:id/variants/:sku/recipe (products.update) → AdminCostSummaryService
 * - Envío a aprobación: POST /admin/production/recipes/products/:id/repost-prices (costing.manage)
 *   → VariantPriceRepostService: calcula el costo, crea hoja de costo y solicitud `pending`. No cambia precios.
 * - Aprobaciones: /admin/production/approvals* (costing.read / costing.manage) → PriceApprovalService.
 *   `publish` escribe `price = suggestedPrice` en la variante: es el ÚNICO paso que cambia el precio de la tienda.
 * - IVA: desde la propuesta docs/proposals/server-iva-precio-sugerido.md (aplicada en el Server), el
 *   envío a aprobación calcula el precio FINAL con el IVA del producto (`priceBasis: 'tax_included'`,
 *   `suggestedPrice` con IVA, `suggestedPriceNet` sin IVA) y exige el IVA configurado. Las solicitudes
 *   anteriores (`priceBasis: 'legacy'`) guardan el precio sin IVA y el Server no las publica.
 */

export const REPOST_STATUSES = ['no_recipe', 'up_to_date', 'needs_repost', 'pending_approval', 'mixed'] as const
export type RepostStatus = (typeof REPOST_STATUSES)[number]

export const REPOST_STATUS_LABELS: Record<RepostStatus, string> = {
  no_recipe: 'Sin receta',
  up_to_date: 'Al día',
  needs_repost: 'Por enviar a aprobación',
  pending_approval: 'En aprobación',
  mixed: 'Mixto',
}

export const APPROVAL_STATUSES = ['pending', 'approved', 'rejected', 'published'] as const
export type ApprovalStatus = (typeof APPROVAL_STATUSES)[number]

export const APPROVAL_STATUS_LABELS: Record<ApprovalStatus, string> = {
  pending: 'Pendientes',
  approved: 'Aprobadas',
  rejected: 'Rechazadas',
  published: 'Publicadas',
}

// ---------- Respuestas del Server ----------

const meta = z.object({ total: z.number(), page: z.number(), pageSize: z.number(), totalPages: z.number() })

export const serverPricingProductListSchema = z.object({
  data: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      slug: z.string(),
      status: z.string().nullable().optional(),
      variantCount: z.number().optional().default(0),
      productionRecipeId: z.string().nullable().optional(),
      recipeName: z.string().nullable().optional(),
      recipeVersion: z.number().nullable().optional(),
      variantRecipeCount: z.number().optional().default(0),
      costsOutdated: z.boolean().optional().default(false),
      repostStatus: z.enum(REPOST_STATUSES).catch('no_recipe'),
      variantsNeedingRepost: z.number().optional().default(0),
      variantsPendingApproval: z.number().optional().default(0),
    }),
  ),
  meta: meta.extend({ needsRepostCount: z.number().optional() }),
})

/** Detalle del producto con los campos de producción de cada variante (serializeAdminVariant). */
export const serverPricingProductDetailSchema = z.object({
  product: z.object({
    id: z.string(),
    name: z.string(),
    slug: z.string(),
    taxRate: z.number().nullable().catch(null),
    productionRecipeId: z.string().nullable().optional(),
  }),
  variants: z.array(
    z.object({
      sku: z.string(),
      price: z.number(),
      options: z.record(z.string()).catch({}),
      productionRecipeId: z.string().nullable().optional(),
      pricing_status: z.string().nullable().optional(),
      cost_status: z.string().nullable().optional(),
      suggested_price: z.number().nullable().optional(),
    }),
  ),
})

export const serverRepostResultSchema = z.object({
  data: z.object({
    results: z.array(
      z.object({
        variantSku: z.string(),
        suggestedPrice: z.number(),
        currentPrice: z.number(),
        skipped: z.boolean().optional(),
        skipReason: z.string().optional(),
      }),
    ),
    reposted: z.number(),
    skipped: z.number(),
    errors: z.array(z.string()),
    message: z.string().optional(),
  }),
})

export const serverApprovalSchema = z.object({
  id: z.string(),
  variantSku: z.string(),
  productSlug: z.string(),
  productName: z.string().nullable().optional(),
  previousCost: z.number().optional().default(0),
  newCost: z.number().optional().default(0),
  previousPrice: z.number(),
  suggestedPrice: z.number(),
  suggestedPriceNet: z.number().nullable().optional(),
  taxRate: z.number().nullable().optional(),
  priceBasis: z.enum(['tax_included', 'legacy']).catch('legacy'),
  marginPercentage: z.number().nullable().optional(),
  status: z.enum(APPROVAL_STATUSES),
  recipeVersion: z.number().nullable().optional(),
  createdBy: z.string().nullable().optional(),
  approvedBy: z.string().nullable().optional(),
  rejectedReason: z.string().nullable().optional(),
  publishedAt: isoDate,
  createdAt: isoDate,
})
export type ServerApproval = z.infer<typeof serverApprovalSchema>

export const serverApprovalListSchema = z.object({ data: z.array(serverApprovalSchema), meta })
export const serverApprovalSummarySchema = z.object({
  data: z.object({ pending: z.number(), approved: z.number(), rejected: z.number(), published: z.number() }),
})
export const serverApprovalMutationSchema = z.object({ data: z.array(serverApprovalSchema) })

// ---------- Vistas ----------

export interface PricingProductRow {
  id: string
  name: string
  slug: string
  variantCount: number
  recipeId: string | null
  recipeName: string | null
  recipeVersion: number | null
  variantRecipeCount: number
  costsOutdated: boolean
  repostStatus: RepostStatus
  variantsNeedingRepost: number
  variantsPendingApproval: number
}

export interface PricingProductList {
  items: PricingProductRow[]
  pagination: AdminPaginationMeta
}

export interface PricingVariant {
  sku: string
  label: string
  price: number
  /** Receta propia de la variante; null = usa la del producto. */
  recipeId: string | null
  pricingStatus: string | null
  costStatus: string | null
  lastSuggestedPrice: number | null
}

export interface PricingProductDetail {
  id: string
  name: string
  slug: string
  taxRate: number | null
  recipeId: string | null
  variants: PricingVariant[]
}

export interface RepostResult {
  reposted: number
  skipped: number
  errors: string[]
  results: { variantSku: string; suggestedPrice: number; currentPrice: number; skipped: boolean; skipReason: string | null }[]
}

export interface ApprovalRow {
  id: string
  variantSku: string
  productSlug: string
  productName: string
  previousCost: number
  newCost: number
  previousPrice: number
  /** Precio que se escribiría al publicar: con IVA si `priceBasis` es 'tax_included'; sin IVA si es 'legacy'. */
  suggestedPrice: number
  /** Base sin IVA del precio sugerido (solo 'tax_included'). */
  suggestedPriceNet: number | null
  /** IVA usado al crear la solicitud (solo 'tax_included'). */
  approvalTaxRate: number | null
  /** 'legacy' = regla anterior (precio sin IVA): el Server no la publica. */
  priceBasis: 'tax_included' | 'legacy'
  marginPercentage: number | null
  status: ApprovalStatus
  recipeVersion: number | null
  createdBy: string | null
  rejectedReason: string | null
  createdAt: string | null
  publishedAt: string | null
  /** IVA actual del producto (%) si se pudo leer; null = sin dato. */
  taxRate: number | null
  /** Precio actual de la variante en la tienda (null si no se pudo leer). */
  currentPrice: number | null
}

export interface ApprovalList {
  items: ApprovalRow[]
  pagination: AdminPaginationMeta
  summary: Record<ApprovalStatus, number>
}

/** Precio con IVA equivalente a un precio sin IVA (informativo, solicitudes 'legacy'). */
export function priceWithTax(price: number, taxRate: number | null): number | null {
  if (taxRate === null || taxRate <= 0) return null
  return Math.round(price * (1 + taxRate / 100))
}

// ---------- Entrada ----------

const objectId = z.string().regex(OBJECT_ID_PATTERN, 'Identificador inválido.')

export const assignRecipeBodySchema = z.object({ recipeId: objectId }).strict()
/** `null` = la variante vuelve a usar la receta del producto. */
export const variantRecipeBodySchema = z.object({ recipeId: objectId.nullable() }).strict()

export const rejectBodySchema = z
  .object({ reason: z.string().trim().min(3, 'Explica el motivo (mínimo 3 caracteres).').max(500) })
  .strict()

/** Sin campos: el precio publicado es el de la solicitud (con IVA). */
export const publishBodySchema = z.object({}).strict()
