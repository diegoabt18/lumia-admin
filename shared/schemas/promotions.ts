import { z } from 'zod'
import type { AdminPaginationMeta } from '../contracts/api'
import { paginationSchema, SLUG_PATTERN } from './common'
import { httpsImageUrl } from './links'

/**
 * Promociones. Fuente en el Server:
 * - Rutas: `/admin/promotions*` (lectura products.read, escritura products.update)
 * - Entrada: promotionUpsertSchema + validatePromotionBusinessRules (admin-promotion.service.ts)
 * - Salida: serializePromotionAdmin
 * - PATCH reemplaza el documento completo (replaceById): el BFF conserva los campos que la
 *   interfaz no edita (imagen de notificación).
 */

export type PromotionLifecycle = 'pendiente' | 'activa' | 'finalizada'

export const LIFECYCLE_LABELS: Record<PromotionLifecycle, string> = {
  pendiente: 'Programada',
  activa: 'Vigente',
  finalizada: 'Finalizada',
}

const percent = z.number().min(0).max(100)

/** Reglas de negocio del Server, replicadas para dar el error en el campo correcto antes de enviar. */
function promotionRules(
  v: { applyGeneralDiscount: boolean; generalPercentOff: number | null; categorySlugs: string[]; productEntries: { productSlug: string; percentOff: number | null }[] },
  ctx: z.RefinementCtx,
) {
  if (!v.categorySlugs.length && !v.productEntries.length) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['productEntries'], message: 'Incluye al menos una categoría o un producto.' })
  }
  if (v.applyGeneralDiscount) {
    if (v.generalPercentOff === null) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['generalPercentOff'], message: 'Indica el porcentaje del descuento general.' })
    }
  } else {
    if (v.categorySlugs.length) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['categorySlugs'], message: 'Las categorías requieren activar el descuento general.' })
    }
    v.productEntries.forEach((e, i) => {
      if (e.percentOff === null) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['productEntries', i, 'percentOff'], message: 'Sin descuento general, cada producto necesita su porcentaje.' })
      }
    })
  }
}

// ---------- Cuerpo que acepta el BFF (camelCase) ----------

export const promotionBodySchema = z
  .object({
    name: z.string().trim().min(1, 'Ingresa el nombre.').max(200, 'Máximo 200 caracteres.'),
    description: z.string().trim().max(8000, 'Máximo 8000 caracteres.'),
    bannerUrl: z.union([httpsImageUrl, z.literal('')]),
    /** Color de fondo de la etiqueta de promoción en la tienda (#rrggbb). Vacío = dorado por defecto. */
    color: z.union([z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Color HEX inválido (#rrggbb).'), z.literal('')]),
    active: z.boolean(),
    startsAt: z.string().datetime({ message: 'Fecha de inicio inválida.' }),
    endsAt: z.string().datetime({ message: 'Fecha de fin inválida.' }),
    priority: z.number().int().min(0).max(999_999),
    applyGeneralDiscount: z.boolean(),
    generalPercentOff: percent.nullable(),
    categorySlugs: z.array(z.string().regex(SLUG_PATTERN)).max(200),
    productEntries: z
      .array(z.object({ productSlug: z.string().regex(SLUG_PATTERN), percentOff: percent.nullable() }))
      .max(500),
  })
  .strict()
  .superRefine((v, ctx) => {
    if (Date.parse(v.endsAt) <= Date.parse(v.startsAt)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['endsAt'], message: 'La fecha de fin debe ser posterior al inicio.' })
    }
    promotionRules(v, ctx)
  })
export type PromotionBody = z.infer<typeof promotionBodySchema>

export const promotionActiveBodySchema = z.object({ active: z.boolean() }).strict()

// ---------- Respuestas del Server ----------

const serverPromotionSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().catch(''),
  bannerUrl: z.string().nullable().catch(null),
  color: z.string().nullable().catch(null),
  active: z.boolean(),
  startsAt: z.string(),
  endsAt: z.string(),
  lifecycle: z.enum(['pendiente', 'activa', 'finalizada']),
  priority: z.number().catch(100),
  applyGeneralDiscount: z.boolean(),
  generalPercentOff: z.number().nullable().catch(null),
  categorySlugs: z.array(z.string()).catch([]),
  productEntries: z.array(z.object({ productSlug: z.string(), percentOff: z.number().nullable().catch(null) })).catch([]),
  notificationImageSlug: z.string().nullable().catch(null),
  notificationImagePath: z.string().nullable().catch(null),
  updatedAt: z.string().nullable().catch(null),
})
export type ServerPromotion = z.infer<typeof serverPromotionSchema>

export const serverPromotionListSchema = z.object({ promotions: z.array(serverPromotionSchema), pagination: paginationSchema })
export const serverPromotionDetailSchema = z.object({ promotion: serverPromotionSchema })

// ---------- Modelo hacia el navegador ----------

export interface PromotionRow {
  id: string
  name: string
  lifecycle: PromotionLifecycle
  active: boolean
  startsAt: string
  endsAt: string
  priority: number
  discountSummary: string
  scopeSummary: string
}

export interface PromotionList {
  items: PromotionRow[]
  pagination: AdminPaginationMeta
}

export type PromotionDetail = Omit<PromotionBody, 'bannerUrl'> & {
  id: string
  bannerUrl: string
  lifecycle: PromotionLifecycle
  updatedAt: string | null
}
