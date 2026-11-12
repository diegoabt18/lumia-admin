import type { H3Event } from 'h3'
import { serverMaterialListSchema } from '#shared/schemas/production'
import {
  serverAssociatedSchema,
  serverCostBreakdownSchema,
  serverRecipeEnvelopeSchema,
  serverRecipeProductsSchema,
  serverRecipeVersionsSchema,
  toRecipeRow,
  type CostBreakdown,
  type RecipeDetail,
  type RecipeSaveResult,
  type ServerRecipe,
} from '#shared/schemas/recipes'
import { parseUpstream } from './request-input'
import { serverApi } from './server-api'
import { throwBffError, UpstreamError } from './upstream'

export async function fetchRecipe(event: H3Event, id: string): Promise<ServerRecipe> {
  return parseUpstream(serverRecipeEnvelopeSchema, await serverApi(event, `/api/admin/production/recipes/${id}`), 'GET /admin/production/recipes/:id').data
}

export async function fetchAssociated(event: H3Event, id: string): Promise<RecipeDetail['associated']> {
  const data = parseUpstream(
    serverAssociatedSchema,
    await serverApi(event, `/api/admin/production/recipes/${id}/associated-products`),
    'GET /admin/production/recipes/:id/associated-products',
  ).data
  return { products: data.products, variants: data.variants }
}

export async function loadRecipeDetail(event: H3Event, id: string): Promise<RecipeDetail> {
  const [recipe, versionsRaw, associated] = await Promise.all([
    fetchRecipe(event, id),
    serverApi(event, `/api/admin/production/recipes/${id}/versions`),
    fetchAssociated(event, id),
  ])
  const versions = parseUpstream(serverRecipeVersionsSchema, versionsRaw, 'GET /admin/production/recipes/:id/versions').data
  return {
    ...toRecipeRow(recipe),
    variantSku: recipe.variantSku?.trim() || null,
    lines: recipe.lines.map((l) => ({
      materialId: l.materialId,
      materialName: l.materialName,
      materialCode: l.materialCode?.trim() || null,
      purchaseUnit: l.materialPurchaseUnit ?? null,
      unit: l.unit,
      quantity: l.quantity,
    })),
    indirectCosts: recipe.indirectCosts.map((c) => ({ name: c.name, type: c.type, value: c.value })),
    versions: versions
      .map((v) => ({ id: v.id, version: v.version, totalCost: v.totalCost, changesDescription: v.changesDescription, createdAt: v.createdAt ?? null }))
      .sort((a, b) => b.version - a.version),
    associated,
  }
}

/**
 * Calcula el costo en el Server (guarda costos y precio sugerido en la receta).
 * Si el Server lo rechaza (unidades incompatibles, contenido sin configurar…), devuelve su mensaje
 * en lugar de fallar: la receta ya quedó guardada.
 */
export async function calculateRecipe(event: H3Event, id: string): Promise<RecipeSaveResult> {
  let breakdown: CostBreakdown | null = null
  let calculationError: string | null = null
  try {
    const data = parseUpstream(
      serverCostBreakdownSchema,
      await serverApi(event, `/api/admin/production/recipes/${id}/calculate-cost`, { method: 'POST' }),
      'POST /admin/production/recipes/:id/calculate-cost',
    ).data
    breakdown = {
      lines: data.lines,
      materialsCost: data.materialsCost,
      indirectCosts: data.indirectCosts,
      indirectCostTotal: data.indirectCostTotal,
      totalCost: data.totalCost,
      marginPercentage: data.marginPercentage ?? null,
      suggestedPrice: data.suggestedPrice ?? null,
      priceRounding: data.config?.priceRounding ?? null,
    }
  } catch (error) {
    if (error instanceof UpstreamError && error.statusCode === 400) calculationError = error.message
    else throw error
  }
  return { recipe: await loadRecipeDetail(event, id), breakdown, calculationError }
}

/** Todos los materiales deben existir (el Server costea en 0 los que no encuentra, sin avisar). */
export async function assertMaterialsExist(event: H3Event, ids: string[]) {
  const unique = [...new Set(ids)]
  const data = parseUpstream(
    serverMaterialListSchema,
    await serverApi(event, '/api/admin/production/materials', { query: { ids: unique.join(',') } }),
    'GET /admin/production/materials?ids',
  )
  const found = new Set(data.data.map((m) => m.id))
  const missing = unique.filter((id) => !found.has(id))
  if (missing.length) {
    throwBffError(422, { code: 'MATERIAL_NOT_FOUND', message: 'Uno o más materiales de la receta ya no existen.', fieldErrors: { lines: ['Revisa los materiales.'] } })
  }
}

/** El producto debe existir en el catálogo (el Server no lo comprueba). Devuelve su nombre. */
export async function resolveProduct(event: H3Event, slug: string): Promise<string> {
  const data = parseUpstream(
    serverRecipeProductsSchema,
    await serverApi(event, '/api/admin/production/recipes/products', { query: { search: slug, limit: 100, page: 1 } }),
    'GET /admin/production/recipes/products',
  )
  const product = data.data.find((p) => p.slug === slug)
  if (!product) {
    throwBffError(422, { code: 'PRODUCT_NOT_FOUND', message: 'El producto no existe en el catálogo.', fieldErrors: { productSlug: ['Elige un producto del catálogo.'] } })
  }
  return product.name
}
