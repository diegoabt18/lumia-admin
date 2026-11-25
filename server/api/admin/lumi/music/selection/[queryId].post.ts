import { z } from 'zod'
import { parseUpstream } from '../../../../utils/request-input'
import { serverApi } from '../../../../utils/server-api'
import { toBffError } from '../../../../utils/upstream'
import { readValidatedJson } from '../../../../utils/validation'

const selectionInputSchema = z.object({
  candidateIndex: z.number().int().min(0).max(4),
  candidateId: z.string().min(1),
  deviceId: z.string().optional(),
})

const selectionResponseSchema = z.object({
  success: z.boolean(),
  status: z.enum(['pending', 'playing', 'failed', 'offline', 'expired']),
})

/**
 * POST /api/admin/lumi/music/selection/[queryId]
 * Selecciona un candidato de música para reproducir.
 * Reenvía a Server: POST /api/admin/lumi/music/selection/{queryId}
 */
export default defineEventHandler(async (event) => {
  const queryId = getRouterParam(event, 'queryId')
  if (!queryId || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(queryId)) {
    throw createError({
      statusCode: 400,
      message: 'queryId inválido',
    })
  }

  const input = await readValidatedJson(event, selectionInputSchema)

  try {
    return parseUpstream(
      selectionResponseSchema,
      await serverApi(event, `/api/admin/lumi/music/selection/${queryId}`, {
        method: 'POST',
        body: input,
      }),
      'POST /admin/lumi/music/selection',
    )
  } catch (error) {
    toBffError(error)
  }
})
