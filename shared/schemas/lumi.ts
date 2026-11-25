import { z } from 'zod'

/**
 * Lumi (asistente del admin). La validación de entrada vive aquí; las respuestas del Server se
 * validan con los esquemas `lumi*Response` antes de llegar al navegador.
 * Fuente: server/src/routes/lumi.routes.ts y server/src/modules/lumi/infrastructure/lumi-assistant.client.ts.
 */

export const LUMI_MESSAGE_MAX = 4000

export const LUMI_PAGES = [
  'dashboard',
  'analytics',
  'inventory',
  'settings',
  'products',
  'orders',
  'categories',
  'subcategories',
  'promotions',
  'banners',
  'images',
  'reviews',
  'production',
  'automations',
  'initiatives',
] as const
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
    /** Campo previo; `webMode` lo sustituye. */
    webSearch: z.boolean().optional(),
    /** Campo previo; `reasoningMode` lo sustituye. */
    think: z.boolean().optional(),
    /** Controles del chat: automático (lo decide el servidor), activado o desactivado. */
    reasoningMode: z.enum(['auto', 'on', 'off']).optional(),
    webMode: z.enum(['auto', 'on', 'off']).optional(),
    /** Límite de tokens de la respuesta, elegido en el chat. */
    maxTokens: z.number().int().min(128).max(2048).optional(),
    /** Respuesta con botón a una confirmación del equipo: el Server solo actúa sobre esa acción. */
    confirmationId: z.string().regex(/^[a-f0-9]{24}$/).optional(),
  })
  .strict()

/** Longitudes de respuesta que ofrece el chat. */
export const LUMI_RESPONSE_LENGTHS = [
  { value: 512, label: 'Corta' },
  { value: 1024, label: 'Media' },
  { value: 2048, label: 'Larga' },
] as const

export const lumiConversationIdSchema = z.string().uuid()

export const lumiListQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(50).default(20),
  offset: z.coerce.number().int().min(0).max(10_000).default(0),
})

/**
 * Referencias de un mensaje (Server: modules/lumi/references/lumi-references.ts). Las arma el
 * Server con ids reales o con los metadatos del buscador web; nunca traen rutas. Lumia Admin las
 * traduce a sus rutas con una lista cerrada (app/features/lumi/utils/references.ts).
 */
export const LUMI_REFERENCE_ENTITIES = ['product', 'category', 'order', 'promotion'] as const
export const LUMI_REFERENCE_MODULES = [
  'dashboard',
  'analytics',
  'orders',
  'products',
  'inventory',
  'categories',
  'promotions',
  'notifications',
  'initiatives',
  'automations',
] as const
export const LUMI_REFERENCES_MAX = 60

const referenceLabel = z.string().trim().min(1).max(160)

/** Solo http(s), sin credenciales. Cualquier otra URL deja la fuente como referencia no navegable. */
export function safeExternalUrl(value: unknown): string | null {
  if (typeof value !== 'string' || value.length > 2048) return null
  try {
    const url = new URL(value)
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return null
    if (url.username || url.password) return null
    return url.toString()
  } catch {
    return null
  }
}

export const lumiReferenceSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('admin_entity'),
    entity: z.enum(LUMI_REFERENCE_ENTITIES),
    id: lumiObjectIdSchema,
    label: referenceLabel,
  }),
  z.object({ type: z.literal('admin_module'), module: z.enum(LUMI_REFERENCE_MODULES), label: referenceLabel }),
  z.object({ type: z.literal('report'), report: z.enum(['sales']), label: referenceLabel }),
  z.object({
    type: z.literal('operation'),
    module: z.enum(LUMI_REFERENCE_MODULES),
    status: z.enum(['success', 'failed']),
    label: referenceLabel,
  }),
  z.object({
    type: z.literal('web_source'),
    index: z.number().int().min(1).max(50),
    title: z.string().max(300).nullable(),
    url: z.preprocess(safeExternalUrl, z.string().nullable()),
    domain: z.string().max(120).nullable(),
    snippet: z.string().max(400).nullable(),
    cited: z.boolean(),
  }),
])
export type LumiReference = z.infer<typeof lumiReferenceSchema>

/**
 * Lista tolerante: descarta una a una las referencias inválidas (un dato raro nunca impide mostrar
 * el mensaje) y convierte la ausencia (mensajes antiguos) en [].
 */
export const lumiReferencesSchema = z
  .array(z.unknown())
  .optional()
  .transform((items): LumiReference[] =>
    (items ?? []).slice(0, LUMI_REFERENCES_MAX).flatMap((item) => {
      const parsed = lumiReferenceSchema.safeParse(item)
      return parsed.success ? [parsed.data] : []
    }),
  )

export const lumiChatResponseSchema = z.object({
  conversationId: z.string().uuid(),
  model: z.string(),
  response: z.string(),
  references: lumiReferencesSchema,
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
      /** Mensajes anteriores a las referencias: lista vacía. */
      references: lumiReferencesSchema,
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
  z.object({ type: z.literal('mode'), webSearch: z.boolean(), reasoning: z.boolean() }),
  /** Herramienta del Server usada en el turno: datos reales consultados con los permisos del usuario. */
  z.object({
    type: z.literal('tool'),
    name: z.string().max(60),
    label: z.string().max(80),
    rows: z.number().int().min(0),
    denied: z.boolean(),
  }),
  z.object({ type: z.literal('thinking'), text: z.string() }),
  z.object({ type: z.literal('token'), text: z.string() }),
  /** Registros, módulos o fuentes de la respuesta. Llega antes de `done`. */
  z.object({ type: z.literal('references'), references: lumiReferencesSchema }),
  /**
   * Acción en un equipo del usuario esperando «sí» / «no» (Lumia Desktop Agent). El chat la muestra
   * con botones; la casilla «no volver a preguntar» solo aplica al «sí».
   */
  z.object({
    type: z.literal('confirmation'),
    id: z.string().regex(/^[a-f0-9]{24}$/),
    summary: z.string().max(400),
    device: z.string().max(80),
    scope: z.string().max(400),
    expiresAt: z.string(),
  }),
  z.object({ type: z.literal('done'), conversationId: z.string().uuid() }),
  z.object({ type: z.literal('error'), message: z.string() }),
])

export type LumiStreamEvent = z.infer<typeof lumiStreamEventSchema>
