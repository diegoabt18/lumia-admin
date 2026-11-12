import { z } from 'zod'
import type { AdminPaginationMeta } from '../contracts/api'
import { isoDate, OBJECT_ID_PATTERN, paginationSchema } from './common'

/**
 * Moderación de reseñas y preguntas. Fuente en el Server:
 * - Rutas: server/src/routes/admin.routes.ts (`/admin/feedback/*`, solo `admin.access`)
 * - Reportes: FeedbackReportRepository.listAdmin (sin contenido del elemento ni producto)
 * - Entrada: adminFeedbackReviewPatchSchema `{hidden?, featured?}` y
 *   adminFeedbackQuestionPatchSchema `{hidden?, answered?}`
 *
 * Solo se expone `hidden`: `featured` (reseñas) y `answered` (preguntas) se guardan, pero
 * nadie los lee (ni la tienda ni el Server), así que cambiarlos no tendría efecto visible.
 * Las respuestas (`answer`) no tienen endpoint de moderación en el Server.
 */

export const FEEDBACK_ENTITY_TYPES = ['review', 'question', 'answer'] as const
export type FeedbackEntityType = (typeof FEEDBACK_ENTITY_TYPES)[number] | 'unknown'

export const FEEDBACK_ENTITY_LABELS: Record<FeedbackEntityType, string> = {
  review: 'Reseña',
  question: 'Pregunta',
  answer: 'Respuesta',
  unknown: 'Desconocido',
}

const serverReportSchema = z.object({
  id: z.string(),
  entityType: z.string().optional(),
  // entity_id lo envía el cliente que reporta (hasta 64 caracteres): no es necesariamente un ObjectId.
  entityId: z.string().optional(),
  userId: z.string().optional(),
  reason: z.string().optional(),
  createdAt: isoDate,
})

export const serverReportListSchema = z.object({
  items: z.array(serverReportSchema),
  pagination: paginationSchema,
})

export interface FeedbackReportRow {
  id: string
  entityType: FeedbackEntityType
  entityId: string
  reporterId: string
  reason: string
  createdAt: string | null
  /** true si el elemento se puede ocultar o mostrar desde el panel. */
  moderatable: boolean
}

export interface FeedbackReportList {
  items: FeedbackReportRow[]
  pagination: AdminPaginationMeta
}

export function toReportRow(input: z.infer<typeof serverReportSchema>): FeedbackReportRow {
  const entityType = (FEEDBACK_ENTITY_TYPES as readonly string[]).includes(input.entityType ?? '')
    ? (input.entityType as FeedbackEntityType)
    : 'unknown'
  const entityId = (input.entityId ?? '').slice(0, 64)
  return {
    id: input.id,
    entityType,
    entityId,
    reporterId: (input.userId ?? '').slice(0, 64),
    reason: (input.reason ?? '').slice(0, 400),
    createdAt: input.createdAt ?? null,
    moderatable: (entityType === 'review' || entityType === 'question') && OBJECT_ID_PATTERN.test(entityId),
  }
}

/** Cuerpo de PATCH /api/admin/feedback/{reviews|questions}/:id. */
export const feedbackVisibilitySchema = z
  .object({ hidden: z.boolean({ required_error: 'Indica si se oculta.', invalid_type_error: 'Valor inválido.' }) })
  .strict()
export type FeedbackVisibility = z.infer<typeof feedbackVisibilitySchema>
