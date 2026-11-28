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
  /**
   * Candidatos de música cuando la confianza es media (0.72-0.87).
   * El usuario selecciona uno y se reproduce.
   */
  z.object({
    type: z.literal('music_candidates'),
    conversationId: z.string().uuid(),
    queryId: z.string().uuid(),
    query: z.string(),
    /** Equipo en el que se buscó y se pondrá el vídeo (Server reciente). */
    deviceId: z.string().max(64).optional(),
    candidates: z.array(z.object({
      id: z.string(), // YouTube video ID
      title: z.string(),
      artist: z.string(),
      duration: z.number(),
      thumbnailUrl: z.string().nullable(),
      type: z.enum(['song', 'live', 'cover', 'remix', 'official', 'unknown']),
    })).min(1).max(5),
    expiresAt: z.string(),
  }),
  z.object({ type: z.literal('done'), conversationId: z.string().uuid() }),
  z.object({ type: z.literal('error'), message: z.string() }),
])

export type LumiStreamEvent = z.infer<typeof lumiStreamEventSchema>

/**
 * Reproducción de música en el equipo (Server: máquina de estados de `browser.media.play`). Solo
 * avanza hacia delante; COMPLETED exige reproducción confirmada y ventana minimizada.
 */
export const LUMI_MUSIC_PLAYBACK_STATES = [
  'RECEIVED',
  'VALIDATED',
  'BROWSER_READY',
  'TAB_READY',
  'NAVIGATING',
  'NAVIGATION_COMPLETED',
  'PLAYING',
  'MINIMIZING',
  'COMPLETED',
  'BROWSER_UNAVAILABLE',
  'TAB_UNAVAILABLE',
  'NAVIGATION_FAILED',
  'VIDEO_UNAVAILABLE',
  'PLAYBACK_BLOCKED',
  'PLAYBACK_FAILED',
  'MINIMIZE_FAILED',
  'EXECUTION_TIMEOUT',
] as const
export type LumiMusicPlaybackState = (typeof LUMI_MUSIC_PLAYBACK_STATES)[number]

/** Identificadores de la operación musical: cada evento dice a qué tarjeta pertenece. */
const lumiMusicPlaybackIdsSchema = z.object({
  queryId: z.string().uuid(),
  candidateId: z.string().regex(/^[0-9a-f]{16}$/),
  conversationId: z.string().max(64).nullable(),
  messageId: z.string().max(64).nullable(),
  deviceId: z.string().max(64).nullable(),
})

export const lumiMusicPlaybackEventSchema = lumiMusicPlaybackIdsSchema.extend({
  state: z.enum(LUMI_MUSIC_PLAYBACK_STATES),
  stage: z.string().max(40).optional(),
})
export type LumiMusicPlaybackEvent = z.infer<typeof lumiMusicPlaybackEventSchema>

export const LUMI_MUSIC_SELECTION_STATUSES = [
  'playing',
  'partial',
  'unverified',
  'failed',
  'offline',
  'expired',
  'busy',
] as const

export const lumiMusicPlaybackResultSchema = lumiMusicPlaybackIdsSchema.extend({
  status: z.enum(LUMI_MUSIC_SELECTION_STATUSES),
  state: z.enum(LUMI_MUSIC_PLAYBACK_STATES).nullable(),
  message: z.string().max(400),
  replayed: z.boolean(),
})
export type LumiMusicPlaybackResult = z.infer<typeof lumiMusicPlaybackResultSchema>

export const lumiMusicSelectionInputSchema = z.object({
  candidateId: z.string().regex(/^[0-9a-f]{16}$/),
  conversationId: z.string().uuid().optional(),
  messageId: z.string().min(1).max(64).regex(/^[A-Za-z0-9_:-]+$/).optional(),
})

/**
 * Canal de sesión de Lumi (`GET /api/lumi/session/stream`, Lumi 2.0 Fase 1.3): avisos de lo que pasa
 * en los otros dispositivos del usuario (LumiChat, otras pestañas). Sin texto de mensajes: solo ids y
 * estados. Protocolo en server/docs/lumi-2.0/SESSION_PROTOCOL.md.
 */
export const LUMI_PRESENCE_STATES = ['idle', 'thinking', 'working', 'waiting_approval', 'error'] as const
export type LumiPresenceState = (typeof LUMI_PRESENCE_STATES)[number]

export const lumiPresenceSchema = z.object({
  state: z.enum(LUMI_PRESENCE_STATES),
  conversationId: z.string().uuid().nullable(),
  at: z.string(),
})
export type LumiPresence = z.infer<typeof lumiPresenceSchema>

export const lumiSessionReadySchema = z.object({ presence: lumiPresenceSchema })
export const lumiSessionConversationEventSchema = z.object({
  conversationId: z.string().uuid(),
  at: z.string(),
})

/** Teléfonos con LumiChat del usuario (Server: `GET/DELETE /api/lumichat/devices`). */
export const lumiMobileDeviceIdSchema = z.string().regex(/^[a-f0-9]{24}$/)
export const lumiMobileDeviceSchema = z.object({
  id: lumiMobileDeviceIdSchema,
  platform: z.enum(['android', 'ios']),
  deviceLabel: z.string().nullable(),
  appVersion: z.string().nullable(),
  active: z.boolean(),
  current: z.boolean(),
  receivesPush: z.boolean(),
  createdAt: z.string(),
  lastSeenAt: z.string(),
})
export const lumiMobileDeviceListSchema = z.object({ items: z.array(lumiMobileDeviceSchema) })
export type LumiMobileDevice = z.infer<typeof lumiMobileDeviceSchema>

/**
 * Preferencias de avisos de Lumi (Server: `GET/PUT /api/lumi/notifications/preferences`, Fase 3.1).
 * Deciden qué llega al teléfono; el centro de notificaciones de Lumia Admin los recibe siempre.
 */
const LUMI_QUIET_TIME = /^([01]\d|2[0-3]):([0-5]\d)$/
export const lumiNotificationPreferencesSchema = z
  .object({
    push: z.object({ orders: z.boolean(), routines: z.boolean(), initiatives: z.boolean() }).strict(),
    quietHours: z
      .object({
        enabled: z.boolean(),
        start: z.string().regex(LUMI_QUIET_TIME, 'Usa el formato HH:MM'),
        end: z.string().regex(LUMI_QUIET_TIME, 'Usa el formato HH:MM'),
      })
      .strict()
      .refine((q) => q.start !== q.end, { message: 'El inicio y el fin no pueden coincidir', path: ['end'] }),
  })
  .strict()
export type LumiNotificationPreferences = z.infer<typeof lumiNotificationPreferencesSchema>

/**
 * Aprobaciones de Lumi (Server: `GET /api/lumi/approvals`, `POST /api/lumi/approvals/:id/resolve`,
 * Lumi 2.0 Fase 4.1). Un solo uso: aprobar ejecuta exactamente lo que dice `summary` (ligado a
 * `paramsHash`); `expired` es una pendiente que ya caducó. `create_automation` (Fase 4.3): una
 * automatización que Lumi propone; no existe hasta aprobarla. `goal_plan` (Fase 6.1): pasos que la IA
 * propone para un objetivo; no se añaden hasta aprobarlos.
 */
export const lumiApprovalIdSchema = z.string().regex(/^[a-f0-9]{24}$/)
export const lumiApprovalSchema = z.object({
  id: lumiApprovalIdSchema,
  kind: z.enum(['delete_routine', 'desktop_action', 'create_automation', 'goal_plan']),
  summary: z.string(),
  paramsHash: z.string().regex(/^[a-f0-9]{64}$/),
  status: z.enum(['pending', 'approved', 'rejected', 'superseded', 'expired']),
  createdAt: z.string(),
  expiresAt: z.string(),
  resolvedAt: z.string().nullable(),
  via: z.enum(['chat', 'button', 'api']).nullable(),
  outcome: z
    .object({ status: z.enum(['done', 'error']), text: z.string(), executionId: z.string().optional() })
    .nullable(),
  /** Conversación del chat en la que se pidió (null en las propuestas de Lumi). */
  conversationId: z.string().nullable(),
})
export const lumiApprovalListSchema = z.object({ items: z.array(lumiApprovalSchema) })
export type LumiApproval = z.infer<typeof lumiApprovalSchema>

export const lumiApprovalListQuerySchema = z.object({ status: z.enum(['pending', 'all']).default('pending') }).strict()

export const lumiApprovalResolveSchema = z
  .object({
    decision: z.enum(['approve', 'reject']),
    remember: z.boolean().default(false),
    paramsHash: z.string().regex(/^[a-f0-9]{64}$/),
  })
  .strict()
export type LumiApprovalResolveInput = z.infer<typeof lumiApprovalResolveSchema>

export const lumiApprovalResolveResultSchema = z.object({
  status: z.enum(['approved', 'rejected']),
  text: z.string(),
})
export type LumiApprovalResolveResult = z.infer<typeof lumiApprovalResolveResultSchema>

/**
 * Estado de las dependencias de Lumi (Server: `GET /api/lumi/health`, Fase 4.2), según la última
 * ronda del monitor (cada minuto). `unknown`: aún no comprobado o sin dato.
 */
export const lumiHealthComponentSchema = z.object({
  component: z.enum(['redis', 'assistant', 'ollama']),
  status: z.enum(['unknown', 'ok', 'down']),
  since: z.string().nullable(),
  lastCheckedAt: z.string().nullable(),
})
export const lumiHealthSchema = z.object({ components: z.array(lumiHealthComponentSchema) })
export type LumiHealthComponent = z.infer<typeof lumiHealthComponentSchema>

/**
 * Memoria de Lumi (Server: `/api/lumi/memory`, Fase 5.1). Corregir crea una versión nueva y deja la
 * anterior como `superseded`; olvidar la marca `forgotten`. Todo recuerdo lleva su procedencia.
 */
export const LUMI_MEMORY_KINDS = ['preference', 'fact', 'commitment', 'decision'] as const
export const lumiMemoryIdSchema = z.string().regex(/^[a-f0-9]{24}$/)
export const lumiMemorySchema = z.object({
  id: lumiMemoryIdSchema,
  kind: z.enum(LUMI_MEMORY_KINDS),
  text: z.string(),
  status: z.enum(['active', 'superseded', 'forgotten']),
  version: z.number().int().positive(),
  previousId: lumiMemoryIdSchema.nullable(),
  source: z.object({
    via: z.enum(['chat', 'panel']),
    by: z.string(),
    phrase: z.string().nullable(),
    conversationId: z.string().nullable(),
  }),
  createdAt: z.string(),
  updatedAt: z.string(),
})
export const lumiMemoryListSchema = z.object({ items: z.array(lumiMemorySchema) })
export type LumiMemory = z.infer<typeof lumiMemorySchema>

export const lumiMemoryListQuerySchema = z.object({ status: z.enum(['active', 'all']).default('active') }).strict()
const lumiMemoryText = z.string().trim().min(3, 'Escribe al menos 3 caracteres').max(300, 'Máximo 300 caracteres')
export const lumiMemoryCreateSchema = z.object({ kind: z.enum(LUMI_MEMORY_KINDS), text: lumiMemoryText }).strict()
export const lumiMemoryCorrectSchema = z.object({ text: lumiMemoryText, kind: z.enum(LUMI_MEMORY_KINDS).optional() }).strict()

/**
 * Objetivos de Lumi (Server: `/api/lumi/goals`, Fase 6.1). Pasos con recordatorio opcional (una tarea
 * normal), historial de seguimiento y evaluación al vencer. Los pasos que propone la IA son una
 * aprobación `goal_plan` que se resuelve con `/api/admin/lumi/approvals/:id/resolve`.
 */
export const LUMI_GOAL_STATUSES = ['active', 'achieved', 'abandoned'] as const
export const lumiGoalIdSchema = z.string().regex(/^[a-f0-9]{24}$/)
export const lumiGoalStepIdSchema = z.string().regex(/^[a-f0-9]{8}$/)
export const lumiGoalSchema = z.object({
  id: lumiGoalIdSchema,
  title: z.string(),
  description: z.string().nullable(),
  dueDate: z.string().nullable(),
  status: z.enum(LUMI_GOAL_STATUSES),
  progress: z.object({ done: z.number().int(), total: z.number().int(), percent: z.number().int() }),
  steps: z.array(
    z.object({
      id: lumiGoalStepIdSchema,
      title: z.string(),
      done: z.boolean(),
      doneAt: z.string().nullable(),
      taskId: z.string().nullable(),
      remindAt: z.string().nullable(),
      origin: z.enum(['admin', 'lumi']),
    }),
  ),
  events: z.array(z.object({ at: z.string(), type: z.string(), text: z.string() })),
  evaluation: z
    .object({
      at: z.string(),
      dueDate: z.string(),
      done: z.number().int(),
      total: z.number().int(),
      result: z.enum(['achieved', 'missed']),
    })
    .nullable(),
  lastProgressAt: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
})
export const lumiGoalListSchema = z.object({ items: z.array(lumiGoalSchema) })
export type LumiGoal = z.infer<typeof lumiGoalSchema>
export type LumiGoalStep = LumiGoal['steps'][number]

export const lumiGoalListQuerySchema = z.object({ status: z.enum(['active', 'all']).default('active') }).strict()
const lumiGoalTitle = z.string().trim().min(3, 'Escribe al menos 3 caracteres').max(120, 'Máximo 120 caracteres')
const lumiGoalDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Fecha inválida')
export const lumiGoalCreateSchema = z
  .object({
    title: lumiGoalTitle,
    description: z.string().trim().max(1000, 'Máximo 1000 caracteres').optional(),
    dueDate: lumiGoalDate.optional(),
  })
  .strict()
export const lumiGoalUpdateSchema = z
  .object({
    title: lumiGoalTitle.optional(),
    description: z.string().trim().max(1000, 'Máximo 1000 caracteres').nullable().optional(),
    dueDate: lumiGoalDate.nullable().optional(),
  })
  .strict()
export const lumiGoalStatusSchema = z.object({ status: z.enum(LUMI_GOAL_STATUSES) }).strict()
export const lumiGoalStepCreateSchema = z
  .object({ title: lumiGoalTitle, remindAt: z.string().datetime({ offset: true }).optional() })
  .strict()
export const lumiGoalStepUpdateSchema = z.object({ done: z.boolean().optional(), title: lumiGoalTitle.optional() }).strict()
export const lumiGoalPlanSchema = z.object({
  approvalId: lumiApprovalIdSchema,
  summary: z.string(),
  paramsHash: z.string().regex(/^[a-f0-9]{64}$/),
  expiresAt: z.string(),
})
export type LumiGoalPlan = z.infer<typeof lumiGoalPlanSchema>

/**
 * Centro de actividad de Lumi (Server: `GET /api/lumi/activity`, Lumi 2.0 Fase 6.2): foto de solo
 * lectura de lo que pide atención. Una sección en `unavailable` no se pudo consultar (su valor llega
 * `null`); `desktop` también es `null` sin `desktop.devices.read` o con el agente apagado.
 */
export const LUMI_ACTIVITY_SECTIONS = ['health', 'approvals', 'tasks', 'goals', 'initiatives', 'errors', 'phones', 'desktop'] as const
export type LumiActivitySection = (typeof LUMI_ACTIVITY_SECTIONS)[number]

export const lumiActivityErrorSchema = z.object({
  source: z.enum(['automation', 'desktop', 'health']),
  key: z.string(),
  title: z.string(),
  message: z.string(),
  at: z.string(),
  severity: z.enum(['retrying', 'final']),
  taskId: z.string().nullable(),
  deviceId: z.string().nullable(),
})
export type LumiActivityError = z.infer<typeof lumiActivityErrorSchema>

export const lumiActivitySchema = z.object({
  generatedAt: z.string(),
  unavailable: z.array(z.enum(LUMI_ACTIVITY_SECTIONS)),
  health: z.array(lumiHealthComponentSchema).nullable(),
  approvals: z
    .object({
      pending: z.number().int().nonnegative(),
      items: z.array(lumiApprovalSchema.pick({ id: true, kind: true, summary: true, paramsHash: true, createdAt: true, expiresAt: true })),
    })
    .nullable(),
  tasks: z
    .object({
      active: z.number().int().nonnegative(),
      paused: z.number().int().nonnegative(),
      upcoming: z.array(z.object({ id: z.string(), title: z.string(), kind: z.string(), nextRunAt: z.string() })),
      pausedItems: z.array(z.object({ id: z.string(), title: z.string(), kind: z.string() })),
    })
    .nullable(),
  goals: z
    .object({
      active: z.number().int().nonnegative(),
      overdue: z.number().int().nonnegative(),
      stalled: z.number().int().nonnegative(),
      items: z.array(
        z.object({
          id: z.string(),
          title: z.string(),
          dueDate: z.string().nullable(),
          progress: z.object({ done: z.number(), total: z.number(), percent: z.number() }),
          overdue: z.boolean(),
          stalled: z.boolean(),
          nextStep: z.string().nullable(),
        }),
      ),
    })
    .nullable(),
  initiatives: z
    .object({
      open: z.number().int().nonnegative(),
      items: z.array(
        z.object({ id: z.string(), kind: z.string(), title: z.string(), priority: z.number(), state: z.string(), lastSeenAt: z.string() }),
      ),
    })
    .nullable(),
  errors: z.array(lumiActivityErrorSchema),
  phones: z
    .array(
      z.object({
        id: z.string(),
        platform: z.string(),
        deviceLabel: z.string().nullable(),
        appVersion: z.string().nullable(),
        current: z.boolean(),
        receivesPush: z.boolean(),
        lastSeenAt: z.string(),
      }),
    )
    .nullable(),
  desktop: z
    .array(z.object({ id: z.string(), name: z.string(), os: z.string(), online: z.boolean(), lastSeenAt: z.string().nullable() }))
    .nullable(),
})
export type LumiActivity = z.infer<typeof lumiActivitySchema>
