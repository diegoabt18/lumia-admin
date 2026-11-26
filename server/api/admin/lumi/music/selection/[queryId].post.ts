import { z } from 'zod'
import { parseUpstream } from '../../../../../utils/request-input'
import { serverApi } from '../../../../../utils/server-api'
import { toBffError } from '../../../../../utils/upstream'
import { readValidatedJson } from '../../../../../utils/validation'

const paramsSchema = z.object({ queryId: z.string().uuid() })

const selectionInputSchema = z.object({
  candidateId: z.string().regex(/^[0-9a-f]{16}$/),
})

const selectionResponseSchema = z.object({
  status: z.enum(['playing', 'unverified', 'failed', 'offline', 'expired', 'busy']),
  message: z.string(),
})

/**
 * Vídeo elegido en la tarjeta de candidatos de Lumi. El Server valida que la búsqueda sea del
 * usuario y siga vigente, ordena el clic al equipo y responde con el resultado que verificó el agente.
 */
export default defineEventHandler(async (event) => {
  const params = paramsSchema.safeParse({ queryId: getRouterParam(event, 'queryId') })
  if (!params.success) throw createError({ statusCode: 400, message: 'Búsqueda no válida' })
  const input = await readValidatedJson(event, selectionInputSchema)

  try {
    return parseUpstream(
      selectionResponseSchema,
      await serverApi(event, `/api/admin/lumi/music/selection/${params.data.queryId}`, {
        method: 'POST',
        body: input,
      }),
      'POST /admin/lumi/music/selection',
    )
  } catch (error) {
    toBffError(error)
  }
})
