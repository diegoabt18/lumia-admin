import { recipePatchBodySchema, type RecipeSaveResult } from '#shared/schemas/recipes'
import { readObjectIdParam } from '../../../../utils/request-input'
import { assertMaterialsExist, calculateRecipe, fetchRecipe, resolveProduct } from '../../../../utils/recipes'
import { serverApi } from '../../../../utils/server-api'
import { throwBffError, toBffError } from '../../../../utils/upstream'
import { readValidatedJson } from '../../../../utils/validation'

/**
 * PATCH /api/admin/production/recipes/:id (Server: recipes.update).
 * Rechaza si la versión cambió desde que se leyó, comprueba producto y materiales, guarda
 * (el Server crea una versión) y recalcula el costo.
 */
export default defineEventHandler(async (event): Promise<RecipeSaveResult> => {
  const id = readObjectIdParam(event)
  const input = await readValidatedJson(event, recipePatchBodySchema)
  try {
    const current = await fetchRecipe(event, id)
    if (current.version !== input.version) {
      throwBffError(409, { code: 'RECIPE_VERSION_CONFLICT', message: 'Otra persona modificó esta receta mientras la editabas. Recarga para ver los cambios.' })
    }
    const body: Record<string, unknown> = {}
    if (input.name !== undefined) body.name = input.name
    if (input.productSlug !== undefined && input.productSlug !== current.productSlug) {
      await resolveProduct(event, input.productSlug)
      body.productSlug = input.productSlug
    }
    if (input.lines !== undefined) {
      await assertMaterialsExist(event, input.lines.map((l) => l.materialId))
      body.lines = input.lines.map((l) => ({ ...l, materialName: '-' }))
    }
    if (input.indirectCosts !== undefined) body.indirectCosts = input.indirectCosts.map((c) => ({ ...c, optional: false }))
    if (input.marginPercentage !== undefined) body.marginPercentage = input.marginPercentage
    if (input.active !== undefined) body.active = input.active
    if (input.changesDescription) body.changesDescription = input.changesDescription
    await serverApi(event, `/api/admin/production/recipes/${id}`, { method: 'PATCH', body })
    return await calculateRecipe(event, id)
  } catch (error) {
    toBffError(error)
  }
})
