import { z } from 'zod'

/**
 * Iniciativas de Lumi (Fase 5). Fuente: server/src/modules/lumi/initiatives/domain/initiative.types.ts.
 * Las reglas de transición se repiten aquí solo para habilitar botones; el Server valida siempre.
 */

export const INITIATIVE_STATES = [
  'nueva',
  'pendiente',
  'en_revision',
  'aceptada',
  'rechazada',
  'completada',
  'descartada',
] as const
export type InitiativeState = (typeof INITIATIVE_STATES)[number]

export const INITIATIVE_LEVELS = ['discreta', 'equilibrada', 'proactiva'] as const
export type InitiativeLevel = (typeof INITIATIVE_LEVELS)[number]

export const INITIATIVE_STATE_LABELS: Record<InitiativeState, string> = {
  nueva: 'Nueva',
  pendiente: 'Pendiente',
  en_revision: 'En revisión',
  aceptada: 'Aceptada',
  rechazada: 'Rechazada',
  completada: 'Completada',
  descartada: 'Descartada',
}

export const INITIATIVE_LEVEL_LABELS: Record<InitiativeLevel, { label: string; description: string }> = {
  discreta: { label: 'Discreta', description: 'Solo aparece en la revisión diaria. No te avisa en el momento.' },
  equilibrada: { label: 'Equilibrada', description: 'Te avisa de lo urgente (sin stock, pedidos muy atrasados).' },
  proactiva: { label: 'Proactiva', description: 'Te avisa de cada iniciativa nueva.' },
}

/** Transiciones que la persona puede pedir (espejo de canTransition del Server). */
export const INITIATIVE_USER_TRANSITIONS: Record<InitiativeState, readonly InitiativeState[]> = {
  nueva: ['pendiente', 'en_revision', 'aceptada', 'rechazada', 'completada', 'descartada'],
  pendiente: ['en_revision', 'aceptada', 'rechazada', 'completada', 'descartada'],
  en_revision: ['pendiente', 'aceptada', 'rechazada', 'completada', 'descartada'],
  aceptada: ['completada', 'descartada'],
  rechazada: [],
  completada: [],
  descartada: [],
}

export const initiativeSchema = z.object({
  id: z.string(),
  kind: z.string(),
  title: z.string(),
  detail: z.string(),
  priority: z.union([z.literal(1), z.literal(2), z.literal(3)]),
  state: z.enum(INITIATIVE_STATES),
  openCount: z.number().int().nonnegative(),
  firstSeenAt: z.string(),
  lastSeenAt: z.string(),
  stateChangedAt: z.string(),
  resolvedAt: z.string().nullish().transform((v) => v ?? null),
})
export type InitiativeRow = z.infer<typeof initiativeSchema>

export const initiativeListResponseSchema = z.object({ items: z.array(initiativeSchema) })

export const initiativeSettingsResponseSchema = z.object({ level: z.enum(INITIATIVE_LEVELS) })

export const initiativeListQuerySchema = z.object({
  state: z.enum(INITIATIVE_STATES).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
})

export const changeInitiativeStateInputSchema = z.object({ state: z.enum(INITIATIVE_STATES) }).strict()

export const initiativeSettingsInputSchema = z.object({ level: z.enum(INITIATIVE_LEVELS) }).strict()
