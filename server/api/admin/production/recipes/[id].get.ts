import type { RecipeDetail } from '#shared/schemas/recipes'
import { readObjectIdParam } from '../../../../utils/request-input'
import { loadRecipeDetail } from '../../../../utils/recipes'
import { toBffError } from '../../../../utils/upstream'

/** GET /api/admin/production/recipes/:id (Server: recipes.read): receta, versiones y productos asociados. */
export default defineEventHandler(async (event): Promise<RecipeDetail> => {
  const id = readObjectIdParam(event)
  try {
    return await loadRecipeDetail(event, id)
  } catch (error) {
    toBffError(error)
  }
})
