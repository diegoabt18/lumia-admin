import { z } from 'zod'
import { OBJECT_ID_PATTERN } from './common'

/**
 * Automatizaciones e iniciativas de Lumi (Fase 5). Fuente de verdad del Server:
 * server/src/modules/lumi/automation/domain/automation.types.ts
 * server/src/modules/lumi/initiatives/domain/initiative.types.ts
 * Las respuestas se validan en el BFF antes de llegar al navegador.
 */

export const DEFAULT_LUMI_TIMEZONE = 'America/Bogota'
export const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/

const isoString = z.string()

export const LUMI_TASK_STATUSES = ['active', 'paused', 'completed'] as const
export type LumiTaskStatus = (typeof LUMI_TASK_STATUSES)[number]

export const lumiScheduleSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('once'), runAt: isoString }),
  z.object({ type: z.literal('daily'), time: z.string(), timezone: z.string() }),
])
export type LumiSchedule = z.infer<typeof lumiScheduleSchema>

export const lumiTaskSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string().nullish().transform((v) => v ?? null),
  kind: z.string(),
  status: z.enum(LUMI_TASK_STATUSES),
  schedule: lumiScheduleSchema,
  nextRunAt: isoString.nullish().transform((v) => v ?? null),
  lastRunAt: isoString.nullish().transform((v) => v ?? null),
  parentTaskId: z.string().nullish().transform((v) => v ?? null),
  createdAt: isoString,
  updatedAt: isoString,
})
export type LumiTaskRow = z.infer<typeof lumiTaskSchema>

export const lumiTaskListResponseSchema = z.object({ items: z.array(lumiTaskSchema) })

export const lumiExecutionSchema = z.object({
  id: z.string(),
  taskId: z.string(),
  status: z.enum(['pending', 'running', 'succeeded', 'failed', 'dead', 'skipped']),
  scheduledFor: isoString,
  attempts: z.number().int().nonnegative(),
  finishedAt: isoString.nullish().transform((v) => v ?? null),
  error: z.string().nullish().transform((v) => v ?? null),
  result: z.string().nullish().transform((v) => v ?? null),
})
export type LumiExecutionRow = z.infer<typeof lumiExecutionSchema>

export const lumiExecutionListResponseSchema = z.object({ items: z.array(lumiExecutionSchema) })

export const lumiRoutineKinds = ['reminder', 'initiative_review'] as const
export type LumiRoutineKind = (typeof lumiRoutineKinds)[number]

const timeField = z.string().regex(TIME_PATTERN, 'Hora inválida (HH:mm, 24 h)')
const timezoneField = z.string().trim().min(1).max(64)

/** Alta de rutina diaria, con segundo aviso opcional (POST /admin/lumi/automation/routines). */
export const createLumiRoutineInputSchema = z
  .object({
    title: z.string().trim().min(1, 'Escribe un título').max(120),
    description: z.string().trim().max(1000).optional(),
    taskKind: z.enum(lumiRoutineKinds),
    time: timeField,
    timezone: timezoneField,
    followUpTime: timeField.optional(),
  })
  .strict()

/** Edición de título y hora de una rutina diaria. */
export const updateLumiTaskInputSchema = z
  .object({
    title: z.string().trim().min(1, 'Escribe un título').max(120).optional(),
    description: z.string().trim().max(1000).nullable().optional(),
    schedule: z
      .object({ type: z.literal('daily'), time: timeField, timezone: timezoneField })
      .optional(),
  })
  .strict()
  .refine((v) => Object.keys(v).length > 0, 'Nada que actualizar')

export const lumiTaskIdSchema = z.string().regex(OBJECT_ID_PATTERN)

export const lumiTaskActionSchema = z.enum(['pause', 'resume'])

export const lumiListTasksQuerySchema = z.object({
  status: z.enum(LUMI_TASK_STATUSES).optional(),
})

export const lumiExecutionsQuerySchema = z.object({
  taskId: z.string().regex(OBJECT_ID_PATTERN).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
})
