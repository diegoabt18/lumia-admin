import { z } from 'zod'
import { paginationSchema } from './common'

/**
 * Learning Engine de Lumi (fase F del Server). Fuente:
 * server/src/modules/lumi/learning/domain/knowledge.types.ts y server/src/routes/lumi-learning.routes.ts.
 */

export const KNOWLEDGE_STATUSES = ['detected', 'pending_review', 'approved', 'rejected', 'deprecated'] as const
export type KnowledgeStatus = (typeof KNOWLEDGE_STATUSES)[number]
export const KNOWLEDGE_SCOPES = ['user', 'global'] as const
export type KnowledgeScope = (typeof KNOWLEDGE_SCOPES)[number]

type Tone = 'neutral' | 'gold' | 'positive' | 'warning' | 'danger' | 'info'

export const KNOWLEDGE_STATUS_META: Record<KnowledgeStatus, { label: string; tone: Tone }> = {
  detected: { label: 'Por confirmar', tone: 'info' },
  pending_review: { label: 'En revisión', tone: 'warning' },
  approved: { label: 'Aprobada', tone: 'positive' },
  rejected: { label: 'Rechazada', tone: 'neutral' },
  deprecated: { label: 'Retirada', tone: 'neutral' },
}

export const KNOWLEDGE_SCOPE_LABELS: Record<KnowledgeScope, string> = { user: 'De un usuario', global: 'Global' }

export const KNOWLEDGE_SOURCE_LABELS: Record<string, string> = {
  button: 'Botón «No era esto»',
  text: 'Corrección en el chat',
  panel: 'Panel',
}

/** Espejo de ADMIN_TRANSITIONS del Server (solo para mostrar botones). */
export const KNOWLEDGE_TRANSITIONS: Partial<Record<KnowledgeStatus, readonly KnowledgeStatus[]>> = {
  detected: ['approved', 'rejected'],
  pending_review: ['approved', 'rejected'],
  approved: ['deprecated', 'rejected'],
  deprecated: ['approved'],
  rejected: ['approved'],
}

export const KNOWLEDGE_ACTION_LABELS: Partial<Record<KnowledgeStatus, string>> = {
  approved: 'Aprobar',
  rejected: 'Rechazar',
  deprecated: 'Retirar',
}

export const knowledgeSchema = z.object({
  id: z.string(),
  scope: z.enum(KNOWLEDGE_SCOPES),
  phrase: z.string(),
  tool: z.string(),
  toolLabel: z.string().nullable(),
  toolExists: z.boolean(),
  status: z.enum(KNOWLEDGE_STATUSES),
  source: z.string(),
  uses: z.number().int().nonnegative(),
  lastUsedAt: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
})
export type Knowledge = z.infer<typeof knowledgeSchema>

export const knowledgeListResponseSchema = z.object({ items: z.array(knowledgeSchema), pagination: paginationSchema })
export const knowledgeResponseSchema = z.object({ knowledge: knowledgeSchema })

export const knowledgeListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).max(10_000).catch(1),
  limit: z.coerce
    .number()
    .int()
    .refine((n) => [20, 50, 100].includes(n))
    .catch(20),
  search: z.string().trim().max(100).optional().catch(undefined),
  scope: z.enum(KNOWLEDGE_SCOPES).optional().catch(undefined),
  status: z.enum(KNOWLEDGE_STATUSES).optional().catch(undefined),
})

export const changeKnowledgeStatusInputSchema = z.object({ status: z.enum(KNOWLEDGE_STATUSES) }).strict()

/* ───────────── «No era esto» ───────────── */

export const feedbackOptionsResponseSchema = z.object({
  items: z.array(z.object({ tool: z.string(), label: z.string(), example: z.string() })),
})
export type FeedbackOption = z.infer<typeof feedbackOptionsResponseSchema>['items'][number]

export const feedbackInputSchema = z
  .object({
    message: z.string().trim().min(2).max(300),
    conversationId: z.string().trim().max(64).optional(),
    tool: z.string().regex(/^[a-z]+(?:\.[a-z_]+)+$/).max(60).optional(),
    wanted: z.string().trim().min(3, 'Escribe al menos 3 caracteres.').max(300, 'Máximo 300 caracteres.').optional(),
  })
  .strict()
  .refine((v) => Boolean(v.tool) !== Boolean(v.wanted), 'Elige una opción o escribe lo que querías.')

export const feedbackResponseSchema = z.union([
  z.object({ saved: z.literal('interpretation'), tool: z.string() }),
  z.object({ saved: z.literal('capability'), registered: z.boolean() }),
])
