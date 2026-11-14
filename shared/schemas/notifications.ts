import { z } from 'zod'
import { OBJECT_ID_PATTERN } from './common'

/**
 * Centro de notificaciones (lumia-admin). Las respuestas del Server se validan con estos esquemas
 * antes de llegar al navegador. Fuente: server/src/routes/store-public.routes.ts (/notifications)
 * y server/src/routes/notifications-stream.routes.ts (SSE).
 */

export const notificationListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).max(10_000).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
})

export const notificationItemSchema = z.object({
  id: z.string(),
  type: z.string(),
  title: z.string(),
  message: z.string(),
  read: z.boolean(),
  reviewed: z.boolean().catch(false),
  reviewedAt: z.string().nullable().catch(null),
  createdAt: z.string(),
  data: z.record(z.string(), z.unknown()).optional(),
})
export type NotificationItem = z.infer<typeof notificationItemSchema>

export const notificationListResponseSchema = z.object({
  items: z.array(notificationItemSchema),
  unreadCount: z.number().int().nonnegative(),
})

export const unreadCountResponseSchema = z.object({
  unreadCount: z.number().int().nonnegative(),
})

export const markNotificationsReadInputSchema = z
  .object({
    ids: z.array(z.string().regex(OBJECT_ID_PATTERN)).min(1).max(100),
  })
  .strict()

export const markNotificationsReadResponseSchema = z.object({
  ok: z.boolean(),
  unreadCount: z.number().int().nonnegative(),
})

export const reviewNotificationResponseSchema = z.object({
  ok: z.boolean(),
  reviewed: z.boolean(),
})

/** Tarea de Lumi asociada a una notificación del motor de automatización, si la hay. */
export function automationTaskIdOf(item: Pick<NotificationItem, 'type' | 'data'>): string | null {
  if (item.type !== 'lumi_automation') return null
  const taskId = item.data?.taskId
  return typeof taskId === 'string' && OBJECT_ID_PATTERN.test(taskId) ? taskId : null
}
