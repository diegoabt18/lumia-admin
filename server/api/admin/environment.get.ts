import { z } from 'zod'
import type { ServerEnvironment } from '#shared/types/environment'
import { serverApi } from '../../utils/server-api'
import { toBffError, UpstreamError } from '../../utils/upstream'

/**
 * Entorno del Server conectado: GET /api/admin/meta (adminGuard admin.access).
 * La interfaz lo muestra siempre para que nadie opere sobre producción sin saberlo.
 * No se expone `apiUrl`: la dirección del Server es privada del BFF.
 */
const metaSchema = z.object({
  nodeEnv: z.string(),
  database: z.object({
    provider: z.enum(['atlas', 'local']).catch('local'),
    tier: z.enum(['production', 'staging', 'development']),
  }),
})

export default defineEventHandler(async (event): Promise<ServerEnvironment> => {
  try {
    const parsed = metaSchema.safeParse(await serverApi(event, '/api/admin/meta'))
    if (!parsed.success) {
      throw new UpstreamError(502, 'UPSTREAM_INVALID_RESPONSE', 'El servidor devolvió metadatos con un formato inesperado.')
    }
    return {
      nodeEnv: parsed.data.nodeEnv,
      databaseProvider: parsed.data.database.provider,
      databaseTier: parsed.data.database.tier,
    }
  } catch (error) {
    toBffError(error)
  }
})
