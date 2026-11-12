import { z } from 'zod'
import type { AdminPaginationMeta } from '../contracts/api'
import { isoDate, paginationSchema } from './common'

/**
 * Inventario. Fuente en el Server:
 * - Rutas: `GET /admin/inventory` (products.read), `PUT /admin/inventory/:sku` y
 *   `PUT /admin/products/:id/inventory/:sku` (products.update; este último verifica que la
 *   variante pertenezca al producto).
 * - Entrada: adminInventoryUpsertSchema. `quantity` es un valor ABSOLUTO (no un ajuste relativo).
 * - Salida: InventoryRepository.listAdmin.
 */

export const stockFormSchema = z.object({
  quantity: z
    .string({ required_error: 'Ingresa la cantidad.' })
    .trim()
    .min(1, 'Ingresa la cantidad.')
    .regex(/^\d{1,7}$/, 'Ingresa un número entero mayor o igual a 0.'),
  isPerOrder: z.boolean(),
})
export type StockFormValues = z.infer<typeof stockFormSchema>

export const stockBodySchema = z
  .object({
    quantity: z.number().int().min(0).max(9_999_999),
    is_per_order: z.boolean().optional(),
  })
  .strict()
export type StockBody = z.infer<typeof stockBodySchema>

export const DEPOSIT_POLICY_TYPES = ['fixed', 'percent', 'materials', 'custom_authorized'] as const
export type DepositPolicyType = (typeof DEPOSIT_POLICY_TYPES)[number]

export const DEPOSIT_POLICY_LABELS: Record<DepositPolicyType, string> = {
  fixed: 'Importe fijo por unidad',
  percent: 'Porcentaje del total de la línea',
  materials: 'Porcentaje del costo de materiales',
  custom_authorized: 'Importe personalizado autorizado',
}

const serverDepositPolicySchema = z.object({
  type: z.enum(DEPOSIT_POLICY_TYPES),
  value: z.number(),
  authorization: z
    .object({ authorizedBy: z.string(), reason: z.string() })
    .optional(),
})
export type DepositPolicyView = z.infer<typeof serverDepositPolicySchema>

export const serverDepositPolicyHistorySchema = z.object({
  sku: z.string(),
  current: serverDepositPolicySchema.nullable(),
  /** Versión de control optimista: se devuelve en cada guardado para detectar cambios ajenos. */
  version: z.number().int().min(0),
  items: z.array(
    z.object({
      id: z.string().catch(''),
      eventType: z.string(),
      description: z.string(),
      previousValue: serverDepositPolicySchema.nullable().catch(null),
      newValue: serverDepositPolicySchema.nullable().catch(null),
      performedBy: z.string().catch(''),
      createdAt: z.string(),
    }),
  ),
})
export type DepositPolicyHistory = z.infer<typeof serverDepositPolicyHistorySchema>

/** Cuerpo que la UI envía al BFF: política completa o null para quitarla. */
export const depositPolicyBodySchema = z
  .object({
    expected_version: z.number().int().min(0, 'Recarga la política antes de guardar.'),
    deposit_policy: z
      .object({
        type: z.enum(DEPOSIT_POLICY_TYPES),
        value: z.number().finite().positive().max(9_999_999_999),
        // Solo el motivo: quién autoriza lo fija el Server desde la sesión.
        authorization: z
          .object({
            reason: z.string().trim().min(1, 'Indica el motivo de la excepción.').max(500),
          })
          .optional(),
      })
      .nullable(),
  })
  .strict()
export type DepositPolicyBody = z.infer<typeof depositPolicyBodySchema>

const serverInventoryRowSchema = z.object({
  sku: z.string(),
  quantity: z.number(),
  reserved: z.number().catch(0),
  available: z.number().catch(0),
  warehouse: z.string().catch('main'),
  isPerOrder: z.boolean().catch(false),
  depositPolicy: serverDepositPolicySchema.nullable().catch(null),
  variantName: z.string().nullable().catch(null),
  productSlug: z.string().nullable().catch(null),
  updatedAt: isoDate,
})

export const serverInventoryListSchema = z.object({
  items: z.array(serverInventoryRowSchema),
  pagination: paginationSchema,
})

export interface InventoryRow {
  sku: string
  quantity: number
  reserved: number
  available: number
  warehouse: string
  isPerOrder: boolean
  depositPolicy: DepositPolicyView | null
  variantName: string | null
  productSlug: string | null
  updatedAt: string | null
}

export interface InventoryList {
  items: InventoryRow[]
  pagination: AdminPaginationMeta
}
