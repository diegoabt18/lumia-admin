import { recipeCreateBodySchema, serverRecipeEnvelopeSchema, type RecipeSaveResult } from '#shared/schemas/recipes'
import { parseUpstream } from '../../../../utils/request-input'
import { assertMaterialsExist, calculateRecipe, resolveProduct } from '../../../../utils/recipes'
import { serverApi } from '../../../../utils/server-api'
import { toBffError } from '../../../../utils/upstream'
import { readValidatedJson } from '../../../../utils/validation'

/**
 * POST /api/admin/production/recipes (Server: recipes.create; el cálculo usa recipes.update).
 * Comprueba producto y materiales, crea la receta y calcula su costo.
 */
export default defineEventHandler(async (event): Promise<RecipeSaveResult> => {
  const input = await readValidatedJson(event, recipeCreateBodySchema)
  try {
    const productName = await resolveProduct(event, input.productSlug)
    await assertMaterialsExist(event, input.lines.map((l) => l.materialId))
    const { data } = parseUpstream(
      serverRecipeEnvelopeSchema,
      await serverApi(event, '/api/admin/production/recipes', {
        method: 'POST',
        body: {
          name: input.name,
          productSlug: input.productSlug,
          productName,
          // materialName es obligatorio en el Server, pero lo reemplaza por el nombre real del material.
          lines: input.lines.map((l) => ({ ...l, materialName: '-' })),
          ...(input.indirectCosts ? { indirectCosts: input.indirectCosts.map((c) => ({ ...c, optional: false })) } : {}),
          ...(input.marginPercentage !== undefined ? { marginPercentage: input.marginPercentage } : {}),
        },
      }),
      'POST /admin/production/recipes',
    )
    return await calculateRecipe(event, data.id)
  } catch (error) {
    toBffError(error)
  }
})
