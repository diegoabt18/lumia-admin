import { z } from 'zod'

/**
 * Lumia Desktop Agent: equipos inscritos, historial de ejecuciones y aprobaciones de Lumi Chat.
 *
 * Fuente (Server): src/routes/lumi-desktop-agent.routes.ts, src/modules/lumi/desktop-agent/domain/
 * device.ts (toDeviceView) y services/execution.service.ts (toExecutionView). El Server no publica
 * contrato compartido para estas rutas: las respuestas se validan aquí.
 */

export const DESKTOP_DEVICE_ID = /^dev_[a-f0-9]{24}$/
export const DESKTOP_EXECUTION_ID = /^exe_[a-f0-9]{24}$/

export const desktopDeviceIdSchema = z.string().regex(DESKTOP_DEVICE_ID)
export const desktopExecutionIdSchema = z.string().regex(DESKTOP_EXECUTION_ID)
export const desktopApprovalIdSchema = z.string().uuid()

const engineStatusSchema = z.object({
  available: z.boolean(),
  reason: z.string().max(120).nullable(),
})

export const desktopDeviceSchema = z.object({
  id: desktopDeviceIdSchema,
  name: z.string().max(64),
  os: z.string().max(32),
  osVersion: z.string().max(64),
  arch: z.string().max(32),
  agentVersion: z.string().max(32),
  status: z.enum(['active', 'revoked']),
  execution: z.enum(['active', 'paused']),
  online: z.boolean(),
  capabilities: z
    .object({
      engines: z.object({ browser: engineStatusSchema, desktop: engineStatusSchema }),
      operations: z.array(z.string().max(64)).max(64),
    })
    .nullable(),
  registeredAt: z.string(),
  revokedAt: z.string().nullable(),
  lastSeenAt: z.string().nullable(),
})
export type DesktopDevice = z.infer<typeof desktopDeviceSchema>

export const desktopDeviceListSchema = z.object({ items: z.array(desktopDeviceSchema).max(200) })

export const desktopEnrollmentSchema = z.object({
  code: z.string().min(8).max(32),
  expiresAt: z.string(),
})
export type DesktopEnrollment = z.infer<typeof desktopEnrollmentSchema>

export const DESKTOP_EXECUTION_STATUSES = [
  'dispatched',
  'received',
  'validated',
  'running',
  'verifying',
  'completed',
  'unverified',
  'failed',
  'rejected',
  'cancelled',
  'timed_out',
] as const
export type DesktopExecutionStatus = (typeof DESKTOP_EXECUTION_STATUSES)[number]

/** Estados en los que la ejecución sigue abierta y se puede pedir su cancelación. */
export const DESKTOP_OPEN_STATUSES: readonly DesktopExecutionStatus[] = ['dispatched', 'received', 'validated', 'running', 'verifying']

export const desktopExecutionSchema = z.object({
  id: desktopExecutionIdSchema,
  deviceId: desktopDeviceIdSchema,
  operation: z.string().max(64),
  /** Resumen sin datos privados (el Server nunca guarda el texto escrito). */
  argsSummary: z.record(z.unknown()),
  status: z.enum(DESKTOP_EXECUTION_STATUSES),
  verification: z.object({ verified: z.boolean(), method: z.string().max(64) }).nullable(),
  error: z.object({ code: z.string().max(64), message: z.string().max(400), retryable: z.boolean() }).nullable(),
  cancelRequested: z.boolean(),
  createdAt: z.string(),
  finishedAt: z.string().nullable(),
  durationMs: z.number().nullable(),
})
export type DesktopExecution = z.infer<typeof desktopExecutionSchema>

export const desktopExecutionListSchema = z.object({ items: z.array(desktopExecutionSchema).max(100) })

export const DESKTOP_APPROVAL_KINDS = ['open_page', 'click_page', 'type_page', 'click_app', 'type_app'] as const

export const desktopApprovalSchema = z.object({
  id: desktopApprovalIdSchema,
  deviceId: desktopDeviceIdSchema,
  kind: z.string().max(32),
  target: z.string().max(300),
  createdAt: z.string(),
})
export type DesktopApproval = z.infer<typeof desktopApprovalSchema>

export const desktopApprovalListSchema = z.object({ items: z.array(desktopApprovalSchema).max(500) })

// ---------------------------------------------------------------------------------------------
// Archivos (fase 6). Fuente: Server src/routes/lumi-desktop-agent.routes.ts (rutas /files) y
// crates/engine-files del agente (forma de los resultados).
// ---------------------------------------------------------------------------------------------

export const DESKTOP_MAX_FILE_BYTES = 100 * 1024 * 1024
export const desktopRootIdSchema = z.string().regex(/^root_[a-f0-9]{12}$/)

/** Nombre de archivo o carpeta válido en cualquier sistema (lo vuelve a validar el agente). */
export const desktopFileNameSchema = z
  .string()
  .min(1)
  .max(200)
  .refine((v) => v !== '.' && v !== '..' && !/[\\/:*?"<>|]/.test(v) && [...v].every((c) => c.charCodeAt(0) >= 0x20), 'Nombre no válido.')
export const desktopRelativePathSchema = z
  .string()
  .max(1024)
  .refine((v) => v === '' || v.split('/').every((p) => desktopFileNameSchema.safeParse(p).success), 'Ruta no válida.')

export const desktopFileRootsSchema = z.object({
  roots: z.array(z.object({ id: desktopRootIdSchema, name: z.string().max(260) })).max(20),
})
export type DesktopFileRoot = z.infer<typeof desktopFileRootsSchema>['roots'][number]

export const desktopFileListSchema = z.object({
  root: desktopRootIdSchema,
  path: z.string().max(1024),
  entries: z
    .array(
      z.object({
        name: z.string().max(260),
        kind: z.enum(['file', 'dir']),
        size: z.number().int().min(0).nullable(),
        modified: z.string().nullable(),
      }),
    )
    .max(500),
  truncated: z.boolean(),
  skipped: z.number().int().min(0),
})
export type DesktopFileList = z.infer<typeof desktopFileListSchema>
export type DesktopFileEntry = DesktopFileList['entries'][number]

export const desktopFileListQuerySchema = z.object({ root: desktopRootIdSchema, path: desktopRelativePathSchema.default('') }).strict()
export const desktopFileDownloadQuerySchema = z
  .object({ root: desktopRootIdSchema, path: desktopRelativePathSchema.refine((v) => v !== '', 'Falta el archivo.') })
  .strict()
export const desktopFileUploadQuerySchema = z
  .object({
    root: desktopRootIdSchema,
    dir: desktopRelativePathSchema.default(''),
    name: desktopFileNameSchema,
    size: z.coerce.number().int().min(0).max(DESKTOP_MAX_FILE_BYTES),
    sha256: z.string().regex(/^[a-f0-9]{64}$/),
  })
  .strict()

export const desktopUploadResultSchema = z.object({
  execution: desktopExecutionSchema,
  file: z.object({ name: z.string(), size: z.number(), sha256: z.string(), path: z.string() }).partial().nullable(),
})
export type DesktopUploadResult = z.infer<typeof desktopUploadResultSchema>

/** Respuesta del listado en el BFF: `enabled` false si el Server no tiene el agente activado. */
export interface DesktopDeviceListResponse {
  enabled: boolean
  items: DesktopDevice[]
}

/** Renombrar un equipo (Server: renameDeviceSchema, 1–64 caracteres). */
export const desktopRenameInputSchema = z
  .object({
    name: z.string().trim().min(1, 'Escribe un nombre.').max(64, 'Máximo 64 caracteres.'),
  })
  .strict()
export type DesktopRenameInput = z.infer<typeof desktopRenameInputSchema>
