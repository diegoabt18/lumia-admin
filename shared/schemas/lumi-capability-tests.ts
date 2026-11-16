import { z } from 'zod'

/**
 * «Probar capacidad» (fase D del Server). Fuente:
 * server/src/modules/lumi/capabilities/domain/capability-test.types.ts y
 * server/src/routes/lumi-capabilities.routes.ts.
 */

export const PHRASE_ROLES = ['test', 'validation', 'control'] as const
export type PhraseRole = (typeof PHRASE_ROLES)[number]

type Tone = 'neutral' | 'gold' | 'positive' | 'warning' | 'danger' | 'info'

export const PHRASE_ROLE_META: Record<PhraseRole, { label: string; hint: string; tone: Tone }> = {
  test: { label: 'Prueba', hint: 'Se ejecuta en la batería.', tone: 'neutral' },
  validation: { label: 'Validación', hint: 'Decide si la capacidad pasa (≥ 90 %).', tone: 'info' },
  control: { label: 'Control', hint: 'Solo para el banco de medición: aquí nunca se ejecuta.', tone: 'gold' },
}

export const EXPECTED_STATUSES = [
  'supported',
  'missing_information',
  'missing_capability',
  'ambiguous',
  'delegated',
  'unsupported',
] as const
export type ExpectedStatus = (typeof EXPECTED_STATUSES)[number]

export const OUTCOME_LABELS: Record<string, string> = {
  supported: 'Usa una herramienta',
  missing_information: 'Pregunta un dato',
  missing_capability: 'Falta la capacidad',
  ambiguous: 'Pide aclarar',
  delegated: 'Lo resuelve otra parte de Lumi',
  unsupported: 'Conversación',
  error: 'Error',
}

/** Estados en los que tiene sentido indicar la herramienta esperada. */
export const STATUSES_WITH_TOOL: readonly ExpectedStatus[] = ['supported', 'missing_information']

/**
 * Herramientas del catálogo del Server (LUMI_TOOLS), todas de lectura. Solo alimenta el selector del
 * formulario: el BFF acepta cualquier nombre con formato válido y el Server, que tiene el registro,
 * rechaza los que no existen. Al añadir una herramienta en el Server conviene añadirla aquí.
 */
export const LUMI_TOOL_NAMES = [
  'orders.lookup',
  'orders.count',
  'orders.recent',
  'sales.summary',
  'products.search',
  'inventory.low',
  'initiatives.list',
  'notifications.unread',
  'products.unpriced',
  'products.untaxed',
] as const

/** Nombre de herramienta con formato válido («dominio.accion»). */
const toolName = z.string().regex(/^[a-z]+(?:\.[a-z_]+)+$/, 'Herramienta no válida.').max(60)

export const TOOL_LABELS: Record<string, string> = {
  'orders.lookup': 'Buscar un pedido',
  'orders.count': 'Contar pedidos',
  'orders.recent': 'Últimos pedidos',
  'sales.summary': 'Resumen de ventas',
  'products.search': 'Buscar productos',
  'inventory.low': 'Stock bajo',
  'initiatives.list': 'Iniciativas',
  'notifications.unread': 'Notificaciones',
  'products.unpriced': 'Productos sin precio',
  'products.untaxed': 'Productos sin IVA',
}

export const STAGE_LABELS: Record<string, string> = {
  learned: 'Aprendido (sin modelo)',
  rules: 'Reglas (sin modelo)',
  selector: 'Selector (Qwen) y Server',
  fallback: 'Sin selector: conversación',
}

export const REPLY_LABELS: Record<string, string> = {
  tools: 'Respondería con los datos',
  reply: 'Respondería con un texto fijo',
  missing_capability: 'Registraría la capacidad que falta (en pruebas no se registra)',
  model: 'Pasaría a la conversación con el modelo (en pruebas no se llama)',
  automation: 'Orden de recordatorio (en pruebas no se crea)',
}

export const RUN_STATUS_META: Record<string, { label: string; tone: Tone }> = {
  running: { label: 'En curso', tone: 'info' },
  done: { label: 'Terminada', tone: 'positive' },
  error: { label: 'Error', tone: 'danger' },
  interrupted: { label: 'Interrumpida', tone: 'warning' },
}

export const capabilityPhraseSchema = z.object({
  id: z.string(),
  capabilityId: z.string(),
  text: z.string(),
  role: z.enum(PHRASE_ROLES),
  expectedStatus: z.enum(EXPECTED_STATUSES),
  expectedTool: z.string().nullable(),
  critical: z.boolean(),
  createdAt: z.string(),
})
export type CapabilityPhrase = z.infer<typeof capabilityPhraseSchema>

export const phraseListResponseSchema = z.object({ items: z.array(capabilityPhraseSchema) })
export const phraseResponseSchema = z.object({ phrase: capabilityPhraseSchema })

const traceSchema = z
  .object({
    stage: z.string(),
    rules: z.object({ tool: z.string(), denied: z.boolean(), explain: z.boolean() }).nullable(),
    selector: z
      .object({
        outcome: z.string(),
        proposal: z.unknown().optional(),
        normalized: z.unknown().optional(),
        parseErrors: z.number().optional(),
        latencyMs: z.number().optional(),
        promptTokens: z.number().optional(),
        completionTokens: z.number().optional(),
        model: z.string().optional(),
        error: z.string().optional(),
      })
      .nullable(),
    interpretation: z.string().nullable(),
    matches: z.array(z.object({ tool: z.string(), input: z.unknown(), denied: z.boolean(), explain: z.boolean() })),
    pendingTool: z.string().nullable().optional(),
    missing: z.array(z.string()),
    delegate: z.string().nullable(),
    need: z.string().nullable(),
    module: z.string().nullable(),
  })
  .nullable()

export const phraseResultSchema = z.object({
  phraseId: z.string().nullable(),
  text: z.string(),
  role: z.enum(PHRASE_ROLES).nullable(),
  critical: z.boolean(),
  expected: z.object({ status: z.enum(EXPECTED_STATUSES), tool: z.string().nullable() }).nullable(),
  actual: z.object({ status: z.string(), tool: z.string().nullable(), reply: z.string() }),
  passed: z.boolean().nullable(),
  automation: z.string().nullable(),
  trace: traceSchema,
  executions: z.array(
    z.object({
      tool: z.string(),
      denied: z.boolean(),
      rows: z.number().nullable(),
      durationMs: z.number(),
      text: z.string().nullable(),
      error: z.string().nullable(),
    }),
  ),
  durationMs: z.number(),
  error: z.string().nullable(),
})
export type PhraseResult = z.infer<typeof phraseResultSchema>

const summarySchema = z
  .object({
    total: z.number(),
    evaluated: z.number(),
    passed: z.number(),
    validation: z.object({ total: z.number(), passed: z.number() }),
    critical: z.object({ total: z.number(), passed: z.number() }),
    batteryPassed: z.boolean().nullable(),
  })
  .nullable()

const runBase = z.object({
  id: z.string(),
  capabilityId: z.string(),
  kind: z.enum(['single', 'battery']),
  status: z.enum(['running', 'done', 'error', 'interrupted']),
  forceSelector: z.boolean(),
  summary: summarySchema,
  error: z.string().nullable(),
  createdAt: z.string(),
  finishedAt: z.string().nullable(),
})

export const testRunSchema = runBase.extend({ results: z.array(phraseResultSchema) })
export type TestRun = z.infer<typeof testRunSchema>
export type TestRunSummary = z.infer<typeof runBase>

export const runListResponseSchema = z.object({ items: z.array(runBase) })
export const runResponseSchema = z.object({ run: testRunSchema })

/* ───────────── Entrada ───────────── */

export const addPhraseInputSchema = z
  .object({
    text: z.string().trim().min(2, 'Mínimo 2 caracteres.').max(500, 'Máximo 500 caracteres.'),
    role: z.enum(PHRASE_ROLES),
    expectedStatus: z.enum(EXPECTED_STATUSES),
    expectedTool: toolName.nullable(),
    critical: z.boolean(),
  })
  .strict()
export type AddPhraseInput = z.infer<typeof addPhraseInputSchema>

export const startRunInputSchema = z.discriminatedUnion('kind', [
  z
    .object({
      kind: z.literal('single'),
      text: z.string().trim().min(2, 'Mínimo 2 caracteres.').max(500, 'Máximo 500 caracteres.'),
      expectedStatus: z.enum(EXPECTED_STATUSES).optional(),
      expectedTool: toolName.optional(),
      forceSelector: z.boolean(),
    })
    .strict(),
  z.object({ kind: z.literal('battery'), forceSelector: z.boolean() }).strict(),
])

/** Cambiar una frase sin borrarla (rol, resultado, herramienta, crítica). */
export const updatePhraseInputSchema = z
  .object({
    role: z.enum(PHRASE_ROLES),
    expectedStatus: z.enum(EXPECTED_STATUSES),
    expectedTool: z.string().regex(/^[a-z]+(?:\.[a-z_]+)+$/).max(60).nullable(),
    critical: z.boolean(),
  })
  .partial()
  .strict()
  .refine((v) => Object.keys(v).length > 0, 'No hay cambios.')
