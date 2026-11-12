import type { RecipeSaveResult } from '#shared/schemas/recipes'
import { readObjectIdParam } from '../../../../../utils/request-input'
import { calculateRecipe } from '../../../../../utils/recipes'
import { toBffError } from '../../../../../utils/upstream'

/** POST /api/admin/production/recipes/:id/calculate (Server: recipes.update → calculate-cost). */
export default defineEventHandler(async (event): Promise<RecipeSaveResult> => {
  const id = readObjectIdParam(event)
  try {
    return await calculateRecipe(event, id)
  } catch (error) {
    toBffError(error)
  }
})
