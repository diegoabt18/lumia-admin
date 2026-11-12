import { z } from 'zod'
import { SKU_PATTERN } from './common'

/**
 * Variantes. Fuente en el Server:
 * - Rutas: `POST /admin/products/:id/variants`, `PATCH|DELETE /admin/products/:id/variants/:sku`
 *   (products.update). El Server comprueba que la variante pertenezca al producto.
 * - Entrada: adminVariantCreateSchema / adminVariantPatchSchema.
 * - Eliminar una variante también borra su registro de inventario (ProductRepository.deleteVariant).
 * - El SKU no se puede cambiar (es la clave de inventario y de las líneas de pedido).
 * - El precio incluye IVA (contrato catalog.ts).
 */

const BARCODE_PATTERN = /^[A-Za-z0-9._-]{4,64}$/
const MONEY_PATTERN = /^\d{1,10}(\.\d{1,2})?$/
const MAX_OPTIONS = 3

// ---------- Formulario ----------

export const variantOptionRowSchema = z.object({
  name: z.string().trim().max(120, 'Máximo 120 caracteres.'),
  value: z.string().trim().max(200, 'Máximo 200 caracteres.'),
})

export const variantFormSchema = z
  .object({
    sku: z
      .string({ required_error: 'Ingresa el SKU.' })
      .trim()
      .min(1, 'Ingresa el SKU.')
      .regex(SKU_PATTERN, 'Usa letras, números, punto, guion o guion bajo (máx. 80).'),
    barcode: z
      .string()
      .trim()
      .refine((v) => v === '' || BARCODE_PATTERN.test(v), 'Entre 4 y 64 caracteres: letras, números, punto, guion o guion bajo.'),
    price: z
      .string({ required_error: 'Ingresa el precio.' })
      .trim()
      .min(1, 'Ingresa el precio.')
      .regex(MONEY_PATTERN, 'Ingresa un valor numérico (ej. 45000).')
      .refine((v) => Number(v) > 0, 'El precio debe ser mayor que 0.'),
    compareAtPrice: z
      .string()
      .trim()
      .refine((v) => v === '' || (MONEY_PATTERN.test(v) && Number(v) > 0), 'Ingresa un valor numérico mayor que 0.'),
    options: z.array(variantOptionRowSchema).max(MAX_OPTIONS, `Máximo ${MAX_OPTIONS} opciones.`),
  })
  .superRefine((v, ctx) => {
    if (v.compareAtPrice !== '' && MONEY_PATTERN.test(v.price) && Number(v.compareAtPrice) <= Number(v.price)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['compareAtPrice'], message: 'Debe ser mayor que el precio de venta.' })
    }
    const seen = new Set<string>()
    v.options.forEach((row, i) => {
      if (!row.name && !row.value) return
      if (!row.name) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['options', i, 'name'], message: 'Indica el nombre de la opción.' })
      if (!row.value) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['options', i, 'value'], message: 'Indica el valor.' })
      const key = row.name.toLowerCase()
      if (row.name && seen.has(key)) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['options', i, 'name'], message: 'Opción repetida.' })
      }
      seen.add(key)
    })
  })
export type VariantFormValues = z.infer<typeof variantFormSchema>

export function optionsFromRows(rows: VariantFormValues['options']): Record<string, string> {
  return Object.fromEntries(rows.filter((r) => r.name && r.value).map((r) => [r.name, r.value]))
}

// ---------- Cuerpos que acepta el BFF ----------

const optionsRecord = z
  .record(z.string().trim().min(1).max(120), z.string().trim().min(1).max(200))
  .refine((o) => Object.keys(o).length <= MAX_OPTIONS, `Máximo ${MAX_OPTIONS} opciones.`)

const price = z.number().positive().max(9_999_999_999)

export const variantCreateBodySchema = z
  .object({
    sku: z.string().trim().regex(SKU_PATTERN),
    barcode: z.string().trim().regex(BARCODE_PATTERN).optional(),
    price,
    compare_at_price: price.optional(),
    options: optionsRecord.optional(),
  })
  .strict()
  .refine((v) => v.compare_at_price === undefined || v.compare_at_price > v.price, {
    path: ['compare_at_price'],
    message: 'Debe ser mayor que el precio de venta.',
  })
export type VariantCreateBody = z.infer<typeof variantCreateBodySchema>

export const variantPatchBodySchema = z
  .object({
    barcode: z.string().trim().regex(BARCODE_PATTERN).nullable().optional(),
    price: price.optional(),
    compare_at_price: price.nullable().optional(),
    options: optionsRecord.optional(),
  })
  .strict()
  .refine((o) => Object.keys(o).length > 0, { message: 'No hay cambios para guardar.' })
export type VariantPatchBody = z.infer<typeof variantPatchBodySchema>

/** Eje de opción normalizado con IDs o legacy sin IDs. */
export interface OptionAxisValue {
  id?: string
  optionId?: string
  value: string
  slug?: string
  position?: number
}

/** Ejes de opción definidos para el producto (normalizados o legacy), para ofrecer valores válidos. */
export interface OptionAxis {
  id?: string
  name: string
  position?: number
  values: (string | OptionAxisValue)[]
}
