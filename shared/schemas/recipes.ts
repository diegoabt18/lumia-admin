import { z } from 'zod'
import type { AdminPaginationMeta } from '../contracts/api'
import { isoDate, OBJECT_ID_PATTERN, SLUG_PATTERN } from './common'
import { UNITS_OF_MEASURE } from './production'

/**
 * Recetas de producción. Fuente en el Server:
 * - Rutas: `/admin/production/recipes*` (recipes.read / create / update / delete)
 * - Servicios: RecipeService (CRUD, versiones), CostingService.calculateRecipeCost (costo y precio sugerido)
 * - Costo = materiales (motor unit-cost-engine) + costos indirectos (fijos o % sobre materiales).
 *   Precio sugerido = costo × (1 + margen/100), redondeado hacia arriba a `priceRounding`.
 * - El cálculo NO usa mano de obra, empaque, costos de producción ni servicios (se guardan aparte y
 *   nada los consume), ni `pricingMode`/`manualPrice`/`actualPrice`, ni la marca `optional` de los
 *   costos indirectos. Lumia Admin no los ofrece para no aparentar un efecto que no tienen.
 * - Guardar cambios crea una versión, incrementa `version` y marca la receta como desactualizada.
 */

export const serverRecipeLineSchema = z.object({
  materialId: z.string().optional().default(''),
  materialName: z.string(),
  materialCode: z.string().nullable().optional(),
  materialPurchaseUnit: z.string().nullable().optional(),
  unit: z.string(),
  quantity: z.number(),
})

export const serverIndirectCostSchema = z.object({
  name: z.string(),
  type: z.enum(['fixed', 'percentage']),
  value: z.number(),
})

export const serverRecipeSchema = z.object({
  id: z.string(),
  name: z.string(),
  productSlug: z.string(),
  productName: z.string().nullable().optional(),
  variantSku: z.string().nullable().optional(),
  version: z.number().int(),
  isActive: z.boolean().optional().default(true),
  lines: z.array(serverRecipeLineSchema).optional().default([]),
  indirectCosts: z.array(serverIndirectCostSchema).optional().default([]),
  cachedMaterialsCost: z.number().optional().default(0),
  cachedIndirectCost: z.number().optional().default(0),
  cachedTotalCost: z.number().optional().default(0),
  marginPercentage: z.number().nullable().optional(),
  suggestedPrice: z.number().nullable().optional(),
  costsOutdated: z.boolean().optional().default(true),
  costsLastCalculatedAt: isoDate,
  updatedAt: isoDate,
})
export type ServerRecipe = z.infer<typeof serverRecipeSchema>

export const serverRecipeListSchema = z.object({
  data: z.array(serverRecipeSchema),
  meta: z.object({ total: z.number(), page: z.number(), pageSize: z.number(), totalPages: z.number() }),
})
export const serverRecipeEnvelopeSchema = z.object({ data: serverRecipeSchema })

export const serverCostBreakdownSchema = z.object({
  data: z.object({
    lines: z.array(z.object({ materialId: z.string().optional().default(''), materialName: z.string(), unit: z.string(), quantity: z.number(), unitCost: z.number(), partialCost: z.number() })),
    materialsCost: z.number(),
    indirectCosts: z.array(z.object({ name: z.string(), type: z.enum(['fixed', 'percentage']), value: z.number(), calculatedAmount: z.number() })),
    indirectCostTotal: z.number(),
    totalCost: z.number(),
    marginPercentage: z.number().nullable().optional(),
    suggestedPrice: z.number().nullable().optional(),
    config: z.object({ priceRounding: z.number().optional() }).partial().optional(),
  }),
})

export const serverRecipeVersionsSchema = z.object({
  data: z.array(
    z.object({
      id: z.string(),
      version: z.number(),
      materialsCost: z.number().optional().default(0),
      indirectCost: z.number().optional().default(0),
      totalCost: z.number().optional().default(0),
      changesDescription: z.string().optional().default(''),
      createdAt: isoDate,
    }),
  ),
})

export const serverAssociatedSchema = z.object({
  data: z.object({
    products: z.array(z.object({ id: z.string(), name: z.string(), slug: z.string() })).optional().default([]),
    variants: z.array(z.object({ id: z.string(), productSlug: z.string(), sku: z.string() })).optional().default([]),
  }),
})

export const serverRecipeProductsSchema = z.object({
  data: z.array(z.object({ id: z.string(), name: z.string(), slug: z.string(), hasRecipe: z.boolean().optional() })),
})

// ---------- Vistas ----------

export interface RecipeRow {
  id: string
  name: string
  productSlug: string
  productName: string | null
  version: number
  isActive: boolean
  lineCount: number
  materialsCost: number
  indirectCost: number
  totalCost: number
  suggestedPrice: number | null
  marginPercentage: number | null
  costsOutdated: boolean
  costsLastCalculatedAt: string | null
}

export interface RecipeList {
  items: RecipeRow[]
  pagination: AdminPaginationMeta
}

export interface CostBreakdown {
  lines: { materialId: string; materialName: string; unit: string; quantity: number; unitCost: number; partialCost: number }[]
  materialsCost: number
  indirectCosts: { name: string; type: 'fixed' | 'percentage'; value: number; calculatedAmount: number }[]
  indirectCostTotal: number
  totalCost: number
  marginPercentage: number | null
  suggestedPrice: number | null
  priceRounding: number | null
}

export interface RecipeDetail extends RecipeRow {
  variantSku: string | null
  lines: { materialId: string; materialName: string; materialCode: string | null; purchaseUnit: string | null; unit: string; quantity: number }[]
  indirectCosts: { name: string; type: 'fixed' | 'percentage'; value: number }[]
  versions: { id: string; version: number; totalCost: number; changesDescription: string; createdAt: string | null }[]
  associated: { products: { id: string; name: string; slug: string }[]; variants: { id: string; productSlug: string; sku: string }[] }
}

/** Respuesta de guardar o calcular: la receta y, si se pudo calcular, el desglose. */
export interface RecipeSaveResult {
  recipe: RecipeDetail
  breakdown: CostBreakdown | null
  /** Mensaje del Server si el cálculo falló (p. ej. unidades incompatibles). */
  calculationError: string | null
}

export interface RecipeProductOption {
  slug: string
  name: string
  hasRecipe: boolean
}

export function toRecipeRow(r: ServerRecipe): RecipeRow {
  return {
    id: r.id,
    name: r.name,
    productSlug: r.productSlug,
    productName: r.productName?.trim() || null,
    version: r.version,
    isActive: r.isActive,
    lineCount: r.lines.length,
    materialsCost: r.cachedMaterialsCost,
    indirectCost: r.cachedIndirectCost,
    totalCost: r.cachedTotalCost,
    suggestedPrice: r.suggestedPrice ?? null,
    marginPercentage: r.marginPercentage ?? null,
    costsOutdated: r.costsOutdated,
    costsLastCalculatedAt: r.costsLastCalculatedAt ?? null,
  }
}

// ---------- Entrada ----------

const lineSchema = z
  .object({
    materialId: z.string().regex(OBJECT_ID_PATTERN, 'Elige un material.'),
    unit: z.enum(UNITS_OF_MEASURE, { errorMap: () => ({ message: 'Elige la unidad.' }) }),
    quantity: z.number({ invalid_type_error: 'Ingresa la cantidad.' }).min(0.001, 'Mínimo 0,001.').max(1e7),
  })
  .strict()

const indirectSchema = z
  .object({
    name: z.string().trim().min(1, 'Ingresa el concepto.').max(120),
    type: z.enum(['fixed', 'percentage']),
    value: z.number({ invalid_type_error: 'Ingresa el valor.' }).min(0, 'No puede ser negativo.').max(1e9),
  })
  .strict()
  .refine((c) => c.type !== 'percentage' || c.value <= 100, { message: 'Máximo 100 %.', path: ['value'] })

const recipeFields = {
  name: z.string().trim().min(1, 'Ingresa el nombre.').max(200),
  productSlug: z.string().trim().regex(SLUG_PATTERN, 'Elige un producto.'),
  lines: z.array(lineSchema).min(1, 'Agrega al menos un material.').max(100),
  indirectCosts: z.array(indirectSchema).max(30),
  marginPercentage: z.number({ invalid_type_error: 'Ingresa el margen.' }).min(0).max(1000),
}

export const recipeCreateBodySchema = z
  .object({ ...recipeFields, indirectCosts: recipeFields.indirectCosts.optional(), marginPercentage: recipeFields.marginPercentage.optional() })
  .strict()
export type RecipeCreateBody = z.infer<typeof recipeCreateBodySchema>

/** `version`: la leída al abrir; el BFF rechaza si otro la cambió. `changesDescription` queda en la versión. */
export const recipePatchBodySchema = z
  .object({
    version: z.number().int().min(1),
    ...Object.fromEntries(Object.entries(recipeFields).map(([k, v]) => [k, v.optional()])) as {
      [K in keyof typeof recipeFields]: z.ZodOptional<(typeof recipeFields)[K]>
    },
    active: z.boolean().optional(),
    changesDescription: z.string().trim().max(500).optional(),
  })
  .strict()
  .refine(
    (o) => ['name', 'productSlug', 'lines', 'indirectCosts', 'marginPercentage', 'active'].some((k) => (o as Record<string, unknown>)[k] !== undefined),
    { message: 'No hay cambios para guardar.' },
  )
export type RecipePatchBody = z.infer<typeof recipePatchBodySchema>
