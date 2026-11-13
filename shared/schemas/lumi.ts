import { z } from 'zod'

/**
 * Lumi (asistente del admin). La validación de entrada vive aquí; las respuestas del Server se
 * validan con los esquemas `lumi*Response` antes de llegar al navegador.
 * Fuente: server/src/routes/lumi.routes.ts y server/src/modules/lumi/infrastructure/lumi-assistant.client.ts.
 */

export const LUMI_MESSAGE_MAX = 4000

export const LUMI_PAGES = ['dashboard', 'analytics', 'inventory', 'settings', 'products', 'orders'] as const
export type LumiPage = (typeof LUMI_PAGES)[number]

const lumiObjectIdSchema = z.string().regex(/^[a-f0-9]{24}$/i)

/** Dónde está el administrador. El Server decide qué datos leer; el navegador no envía texto libre. */
export const lumiContextSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('product'), id: lumiObjectIdSchema }),
  z.object({ kind: z.literal('order'), id: lumiObjectIdSchema }),
  z.object({ kind: z.literal('page'), page: z.enum(LUMI_PAGES) }),
])
export type LumiContextInput = z.infer<typeof lumiContextSchema>

export const LUMI_PRODUCT_ASSIST_ACTIONS = [
  'generate_title',
  'generate_description',
  'improve_description',
  'fix_spelling',
  'change_tone',
  'seo_title',
  'meta_description',
] as const

export const lumiProductAssistInputSchema = z
  .object({
    action: z.enum(LUMI_PRODUCT_ASSIST_ACTIONS),
    tone: z.enum(['commercial', 'friendly', 'formal']).optional(),
    text: z.string().trim().max(8000).optional(),
  })
  .strict()

export const lumiProductAssistResponseSchema = z.object({
  action: z.string(),
  text: z.string().min(1),
})

export const lumiChatInputSchema = z
  .object({
    message: z.string().trim().min(1, 'Escribe un mensaje.').max(LUMI_MESSAGE_MAX, `Máximo ${LUMI_MESSAGE_MAX} caracteres.`),
    conversationId: z.string().uuid().optional(),
    context: lumiContextSchema.optional(),
    /** Búsqueda web (requiere lumi.web). Solo la pregunta sale a internet. */
    webSearch: z.boolean().optional(),
  })
  .strict()

export const lumiConversationIdSchema = z.string().uuid()

export const lumiListQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(50).default(20),
  offset: z.coerce.number().int().min(0).max(10_000).default(0),
})

export const lumiChatResponseSchema = z.object({
  conversationId: z.string().uuid(),
  model: z.string(),
  response: z.string(),
})

export const lumiConversationSummarySchema = z.object({
  id: z.string().uuid(),
  title: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
  messageCount: z.number().int().min(0),
})

export const lumiConversationsResponseSchema = z.array(lumiConversationSummarySchema)

export const lumiConversationDetailResponseSchema = z.object({
  id: z.string().uuid(),
  title: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
  messages: z.array(
    z.object({
      id: z.number(),
      role: z.enum(['user', 'assistant']),
      content: z.string(),
      createdAt: z.string(),
    }),
  ),
})

export type LumiChatInput = z.infer<typeof lumiChatInputSchema>
export type LumiChatResponse = z.infer<typeof lumiChatResponseSchema>
export type LumiConversationSummary = z.infer<typeof lumiConversationSummarySchema>
export type LumiConversationDetail = z.infer<typeof lumiConversationDetailResponseSchema>
export type LumiMessage = LumiConversationDetail['messages'][number]

/** Eventos del stream SSE (`/api/admin/lumi/chat/stream`). Cada evento lleva `type` y su carga. */
export const lumiStreamEventSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('start'), conversationId: z.string().uuid() }),
  z.object({ type: z.literal('token'), text: z.string() }),
  z.object({ type: z.literal('done'), conversationId: z.string().uuid() }),
  z.object({ type: z.literal('error'), message: z.string() }),
])

export type LumiStreamEvent = z.infer<typeof lumiStreamEventSchema>
