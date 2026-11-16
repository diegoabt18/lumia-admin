import { z } from 'zod'
import { paginationSchema } from './common'

/**
 * Capacidades que le faltan a Lumi (fase B del Server).
 * Fuente: server/src/modules/lumi/capabilities/domain/capability.types.ts y
 * server/src/routes/lumi-capabilities.routes.ts. Las transiciones se repiten aquí solo para mostrar
 * botones; el Server valida siempre.
 */

export const CAPABILITY_STATUSES = [
  'detected',
  'pending_review',
  'approved',
  'in_development',
  'ready_for_testing',
  'testing',
  'failed',
  'validated',
  'enabled',
  'disabled',
  'rejected',
  'duplicate',
] as const
export type CapabilityStatus = (typeof CAPABILITY_STATUSES)[number]

type Tone = 'neutral' | 'gold' | 'positive' | 'warning' | 'danger' | 'info'

export const CAPABILITY_STATUS_META: Record<CapabilityStatus, { label: string; tone: Tone }> = {
  detected: { label: 'Detectada', tone: 'info' },
  pending_review: { label: 'En revisión', tone: 'warning' },
  approved: { label: 'Aprobada', tone: 'gold' },
  in_development: { label: 'En desarrollo', tone: 'gold' },
  ready_for_testing: { label: 'Lista para probar', tone: 'gold' },
  testing: { label: 'En pruebas', tone: 'info' },
  failed: { label: 'Pruebas fallidas', tone: 'danger' },
  validated: { label: 'Validada', tone: 'positive' },
  enabled: { label: 'Habilitada', tone: 'positive' },
  disabled: { label: 'Deshabilitada', tone: 'neutral' },
  rejected: { label: 'Rechazada', tone: 'neutral' },
  duplicate: { label: 'Fusionada', tone: 'neutral' },
}

/** Espejo de MANUAL_TRANSITIONS del Server. Probar y habilitar no se hace a mano. */
export const CAPABILITY_MANUAL_TRANSITIONS: Partial<Record<CapabilityStatus, readonly CapabilityStatus[]>> = {
  detected: ['pending_review', 'rejected'],
  pending_review: ['approved', 'rejected', 'detected'],
  approved: ['in_development', 'rejected', 'pending_review'],
  in_development: ['ready_for_testing', 'approved'],
  ready_for_testing: ['in_development'],
  rejected: ['pending_review'],
}

/** Texto del botón que lleva a cada estado. */
export const CAPABILITY_TRANSITION_LABELS: Partial<Record<CapabilityStatus, string>> = {
  pending_review: 'Pasar a revisión',
  approved: 'Aprobar',
  in_development: 'Marcar en desarrollo',
  ready_for_testing: 'Lista para probar',
  rejected: 'Rechazar',
  detected: 'Devolver a detectada',
}

export const CAPABILITY_MODULES = [
  'productos',
  'inventario',
  'pedidos',
  'pagos',
  'ventas',
  'clientes',
  'promociones',
  'banners',
  'categorias',
  'resenas',
  'produccion',
  'usuarios',
  'configuracion',
  'recordatorios',
  'notificaciones',
  'iniciativas',
  'none',
] as const
export type CapabilityModule = (typeof CAPABILITY_MODULES)[number]

export const CAPABILITY_MODULE_LABELS: Record<CapabilityModule, string> = {
  productos: 'Productos',
  inventario: 'Inventario',
  pedidos: 'Pedidos',
  pagos: 'Pagos',
  ventas: 'Ventas',
  clientes: 'Clientes',
  promociones: 'Promociones',
  banners: 'Banners',
  categorias: 'Categorías',
  resenas: 'Reseñas',
  produccion: 'Producción',
  usuarios: 'Usuarios',
  configuracion: 'Configuración',
  recordatorios: 'Recordatorios',
  notificaciones: 'Notificaciones',
  iniciativas: 'Iniciativas',
  none: 'Sin módulo',
}

export const CAPABILITY_PRIORITIES = ['low', 'normal', 'high'] as const
export type CapabilityPriority = (typeof CAPABILITY_PRIORITIES)[number]

export const CAPABILITY_PRIORITY_META: Record<CapabilityPriority, { label: string; tone: Tone }> = {
  low: { label: 'Baja', tone: 'neutral' },
  normal: { label: 'Normal', tone: 'info' },
  high: { label: 'Alta', tone: 'danger' },
}

export const CAPABILITY_SORTS = ['recent', 'requests', 'created'] as const
export type CapabilitySort = (typeof CAPABILITY_SORTS)[number]
export const CAPABILITY_SORT_LABELS: Record<CapabilitySort, string> = {
  recent: 'Pedidas recientemente',
  requests: 'Más pedidas',
  created: 'Detectadas recientemente',
}

/* ───────────── Especificación ───────────── */

export const CAPABILITY_SPEC_FIELDS = [
  { key: 'expectedResult', label: 'Resultado esperado', hint: 'Qué debe devolver Lumi. Ej.: lista de productos con nombre y precio.', max: 1000 },
  { key: 'parameters', label: 'Parámetros', hint: 'Qué datos necesita la petición. Ej.: periodo, categoría.', max: 1000 },
  { key: 'rules', label: 'Reglas', hint: 'Criterios exactos. Ej.: precio nulo o cero; excluir productos inactivos.', max: 1000 },
  { key: 'proposedPermission', label: 'Permiso propuesto', hint: 'Permiso del Server que debería exigir. Ej.: products.read.', max: 100 },
  { key: 'dataSource', label: 'Origen de los datos', hint: 'Repositorio o endpoint candidato.', max: 300 },
  { key: 'relatedTool', label: 'Herramienta relacionada', hint: 'Herramienta parecida que ya existe, si la hay.', max: 100 },
  { key: 'notes', label: 'Notas', hint: 'Cualquier otro detalle para quien la programe.', max: 2000 },
] as const
export type CapabilitySpecKey = (typeof CAPABILITY_SPEC_FIELDS)[number]['key']

const specText = (max: number) => z.string().trim().max(max, `Máximo ${max} caracteres.`)

export const capabilitySpecSchema = z.object({
  expectedResult: specText(1000),
  parameters: specText(1000),
  rules: specText(1000),
  proposedPermission: specText(100),
  dataSource: specText(300),
  relatedTool: specText(100),
  notes: specText(2000),
})
export type CapabilitySpec = z.infer<typeof capabilitySpecSchema>

/** Borrador con IA (Server: lumi.capabilities.manage). No se guarda hasta que el administrador lo confirma. */
export const capabilitySpecDraftResponseSchema = z.object({ spec: capabilitySpecSchema, model: z.string() })

/* ───────────── Respuestas del Server ───────────── */

const capabilityBase = z.object({
  id: z.string(),
  key: z.string(),
  title: z.string(),
  description: z.string(),
  module: z.enum(CAPABILITY_MODULES),
  status: z.enum(CAPABILITY_STATUSES),
  priority: z.enum(CAPABILITY_PRIORITIES),
  keywords: z.array(z.string()),
  requestCount: z.number().int().nonnegative(),
  samples: z.array(z.string()),
  mergedInto: z.string().nullable(),
  possibleDuplicateOf: z.string().nullable(),
  /** Herramienta del Server que la implementa (fase E). */
  toolName: z
    .string()
    .nullable()
    .optional()
    .transform((v) => v ?? null),
  firstSeenAt: z.string(),
  lastSeenAt: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
})

export const capabilitySummarySchema = capabilityBase
export type CapabilitySummary = z.infer<typeof capabilitySummarySchema>

export const capabilityHistoryEntrySchema = z.object({
  at: z.string(),
  by: z.string(),
  action: z.enum(['created', 'updated', 'status', 'merged_from', 'merged_into', 'tested', 'implemented']),
  from: z.string().optional(),
  to: z.string().optional(),
})

export const capabilitySchema = capabilityBase.extend({
  spec: capabilitySpecSchema,
  history: z.array(capabilityHistoryEntrySchema),
  /** Última batería (fase D). */
  lastTest: z
    .object({ runId: z.string(), at: z.string(), passed: z.boolean().nullable(), validationAccuracy: z.number().nullable() })
    .nullable()
    .optional()
    .transform((v) => v ?? null),
})
export type Capability = z.infer<typeof capabilitySchema>

export const capabilityListResponseSchema = z.object({
  items: z.array(capabilitySummarySchema),
  pagination: paginationSchema,
})
export type CapabilityList = z.infer<typeof capabilityListResponseSchema>

const countMap = z.record(z.string(), z.number().int().nonnegative())

export const capabilityStatsSchema = z.object({
  total: z.number().int().nonnegative(),
  byStatus: countMap,
  byModule: countMap,
  requestsSince: z.number().int().nonnegative(),
})
export type CapabilityStats = z.infer<typeof capabilityStatsSchema>

export const capabilityDetailSchema = z.object({
  capability: capabilitySchema,
  recentRequests: z.array(z.object({ message: z.string(), createdAt: z.string() })),
  distinctUsers: z.number().int().nonnegative(),
})
export type CapabilityDetail = z.infer<typeof capabilityDetailSchema>

export const capabilityResponseSchema = z.object({ capability: capabilitySchema })

/* ───────────── Entrada del BFF ───────────── */

export const capabilityListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).max(10_000).catch(1),
  limit: z.coerce
    .number()
    .int()
    .refine((n) => [20, 50, 100].includes(n))
    .catch(20),
  search: z.string().trim().max(100).optional().catch(undefined),
  status: z.enum(CAPABILITY_STATUSES).optional().catch(undefined),
  module: z.enum(CAPABILITY_MODULES).optional().catch(undefined),
  priority: z.enum(CAPABILITY_PRIORITIES).optional().catch(undefined),
  sort: z.enum(CAPABILITY_SORTS).optional().catch(undefined),
})

export const capabilityGeneralSchema = z.object({
  title: z.string().trim().min(3, 'Mínimo 3 caracteres.').max(120, 'Máximo 120 caracteres.'),
  description: z.string().trim().max(2000, 'Máximo 2000 caracteres.'),
  module: z.enum(CAPABILITY_MODULES),
  priority: z.enum(CAPABILITY_PRIORITIES),
})
export type CapabilityGeneral = z.infer<typeof capabilityGeneralSchema>

export const updateCapabilityInputSchema = capabilityGeneralSchema
  .extend({ spec: capabilitySpecSchema.partial() })
  .partial()
  .strict()
  .refine((v) => Object.keys(v).length > 0, 'No hay cambios que guardar.')

export const changeCapabilityStatusInputSchema = z.object({ status: z.enum(CAPABILITY_STATUSES) }).strict()

export const mergeCapabilityInputSchema = z.object({ targetId: z.string().regex(/^[a-f0-9]{24}$/) }).strict()

/** Especificación en Markdown, para entregarla a quien programe la herramienta. */
export function capabilityToMarkdown(capability: Capability, examples: readonly string[]): string {
  const lines = [
    `# ${capability.title}`,
    '',
    `- Clave: \`${capability.key}\``,
    `- Módulo: ${CAPABILITY_MODULE_LABELS[capability.module]}`,
    `- Estado: ${CAPABILITY_STATUS_META[capability.status].label}`,
    `- Prioridad: ${CAPABILITY_PRIORITY_META[capability.priority].label}`,
    `- Veces pedida: ${capability.requestCount}`,
  ]
  if (capability.description) lines.push('', '## Descripción', '', capability.description)
  lines.push('', '## Especificación', '')
  for (const field of CAPABILITY_SPEC_FIELDS) {
    lines.push(`**${field.label}:** ${capability.spec[field.key] || '_(sin completar)_'}`, '')
  }
  if (examples.length) {
    lines.push('## Frases de ejemplo', '')
    for (const example of examples) lines.push(`- ${example.replace(/\s+/g, ' ')}`)
  }
  return `${lines.join('\n').trim()}\n`
}

/* ───────────── Activación (fase E) ───────────── */

export const enablementCheckSchema = z.object({
  key: z.enum(['implemented', 'permission', 'arguments', 'validated', 'documented']),
  label: z.string(),
  ok: z.boolean(),
  detail: z.string().nullable(),
})
export type EnablementCheck = z.infer<typeof enablementCheckSchema>

export const enablementResponseSchema = z.object({ checks: z.array(enablementCheckSchema), canEnable: z.boolean() })

export const enableCapabilityInputSchema = z.object({ documented: z.literal(true) }).strict()

/* ───────────── Métricas de turnos (fase G) ───────────── */

export const TURN_STAGES = ['automation', 'correction', 'learned', 'rules', 'selector', 'fallback'] as const
export type TurnStage = (typeof TURN_STAGES)[number]

export const TURN_STAGE_LABELS: Record<TurnStage, { label: string; hint: string }> = {
  automation: { label: 'Recordatorios', hint: 'Órdenes de recordatorio resueltas por reglas' },
  correction: { label: 'Correcciones', hint: '«No, me refiero a…» y su confirmación' },
  learned: { label: 'Aprendido', hint: 'Frases que el equipo le enseñó (sin modelo)' },
  rules: { label: 'Reglas', hint: 'Herramientas reconocidas sin modelo' },
  selector: { label: 'Selector (Qwen)', hint: 'El modelo propuso y el Server decidió' },
  fallback: { label: 'Conversación', hint: 'Sin herramienta: respondió el modelo de chat' },
}

export const TURN_METRICS_DAYS = [1, 7, 30] as const

export const turnMetricsSchema = z.object({
  days: z.number(),
  from: z.string(),
  to: z.string(),
  turns: z.number(),
  stages: z.record(z.string(), z.number()),
  interpretations: z.record(z.string(), z.number()),
  withoutModelRate: z.number().nullable(),
  selectorCalls: z.number(),
  selectorCallsPer100: z.number().nullable(),
  selectorErrors: z.number(),
  selectorLatencyMsAvg: z.number().nullable(),
  selectorPromptTokensAvg: z.number().nullable(),
  selectorCompletionTokensAvg: z.number().nullable(),
  selectorCallsWithExamples: z.number(),
  series: z.array(z.object({ day: z.string(), turns: z.number(), selectorCalls: z.number() })),
})
export type TurnMetrics = z.infer<typeof turnMetricsSchema>

export const turnMetricsQuerySchema = z.object({
  days: z.coerce
    .number()
    .int()
    .refine((d) => [1, 7, 30].includes(d))
    .catch(7),
})
