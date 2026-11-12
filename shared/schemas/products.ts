import { z } from 'zod'
import type { AdminPaginationMeta } from '../contracts/api'
import { OBJECT_ID_PATTERN, isoDate, paginationSchema, slugField } from './common'
import type { OptionAxis } from './variants'

/**
 * Productos. Fuente en el Server:
 * - Rutas: server/src/routes/admin.routes.ts (`/admin/products`, permisos products.*)
 * - Entrada: adminProductCreateSchema / adminProductPatchSchema
 * - Salida: AdminProductService.serializeProduct / serializeAdminVariant
 *
 * El slug NO se edita en productos existentes: el Server no actualiza `product_slug`
 * de las variantes ni el inventario al cambiarlo.
 */

// ---------- Formulario (valores de texto de los inputs) ----------

const taxRateText = z
  .string()
  .trim()
  .refine((v) => v === '' || (/^\d{1,3}(\.\d{1,2})?$/.test(v) && Number(v) <= 100), {
    message: 'Ingresa un porcentaje entre 0 y 100 (ej. 19).',
  })

export const productFormSchema = z.object({
  name: z
    .string({ required_error: 'Ingresa el nombre.' })
    .trim()
    .min(1, 'Ingresa el nombre.')
    .max(200, 'Máximo 200 caracteres.'),
  slug: slugField,
  /** Solo para filtrar el selector de subcategoría; no se envía al Server. */
  categoryId: z.string().max(40),
  /** Obligatoria: el Server deriva la categoría desde la subcategoría. */
  subcategoryId: z.string().regex(OBJECT_ID_PATTERN, 'Selecciona una subcategoría.'),
  brand: z.string().trim().max(120, 'Máximo 120 caracteres.'),
  status: z.enum(['active', 'inactive']),
  taxRate: taxRateText,
  description: z.string().max(8000, 'Máximo 8000 caracteres.'),
})
export type ProductFormValues = z.infer<typeof productFormSchema>

// ---------- Cuerpos que acepta el BFF (mismas reglas que el Server) ----------

export const productCreateBodySchema = z.object({
  name: z.string().trim().min(1).max(200),
  slug: slugField,
  description: z.string().max(8000).optional(),
  subcategory_id: z.string().regex(OBJECT_ID_PATTERN),
  brand: z.string().max(120).optional(),
  status: z.enum(['active', 'inactive']).optional(),
  tax_rate: z.number().min(0).max(100).nullable().optional(),
})
export type ProductCreateBody = z.infer<typeof productCreateBodySchema>

export const productPatchBodySchema = z
  .object({
    name: z.string().trim().min(1).max(200).optional(),
    description: z.string().max(8000).nullable().optional(),
    subcategory_id: z.string().regex(OBJECT_ID_PATTERN).optional(),
    brand: z.string().max(120).nullable().optional(),
    status: z.enum(['active', 'inactive']).optional(),
    tax_rate: z.number().min(0).max(100).nullable().optional(),
    option_axes: z
      .array(z.object({
        name: z.string(),
        position: z.number().optional(),
        values: z.array(z.union([
          z.string(),
          z.object({
            value: z.string(),
            slug: z.string().optional(),
            position: z.number().optional(),
            id: z.string().optional(),
            optionId: z.string().optional(),
          })
        ])),
      }))
      .optional(),
  })
  .strict()
  .refine((o) => Object.keys(o).length > 0, { message: 'No hay cambios para guardar.' })
export type ProductPatchBody = z.infer<typeof productPatchBodySchema>

/** Convierte el formulario en cuerpo de alta. */
export function toProductCreateBody(v: ProductFormValues): ProductCreateBody {
  return {
    name: v.name,
    slug: v.slug,
    status: v.status,
    ...(v.description.trim() ? { description: v.description } : {}),
    subcategory_id: v.subcategoryId,
    ...(v.brand ? { brand: v.brand } : {}),
    tax_rate: v.taxRate === '' ? null : Number(v.taxRate),
  }
}

// ---------- Respuestas del Server ----------

const serverProductSchema = z.object({
  id: z.string(),
  name: z.string(),
  slug: z.string(),
  taxRate: z.number().nullable().catch(null),
  description: z.string().nullable().catch(null),
  categorySlug: z.string().nullable().catch(null),
  categoryName: z.string().nullable().catch(null),
  categoryId: z.string().nullable().catch(null),
  subcategoryId: z.string().nullable().catch(null),
  subcategoryName: z.string().nullable().catch(null),
  brand: z.string().nullable().catch(null),
  status: z.enum(['active', 'inactive']).catch('active'),
  createdAt: isoDate,
  updatedAt: isoDate,
  imagePath: z.string().nullable().catch(null),
})

export const serverProductListSchema = z.object({
  products: z.array(serverProductSchema),
  pagination: paginationSchema,
})

const serverVariantSchema = z.object({
  sku: z.string(),
  barcode: z.string().nullable().catch(null),
  price: z.number(),
  currency: z.string().catch('COP'),
  options: z.record(z.string()).catch({}),
  compareAtPrice: z.number().nullable().catch(null),
  stock: z.number().catch(0),
  reserved: z.number().catch(0),
  available: z.number().catch(0),
  inventory: z
    .array(z.object({ is_per_order: z.boolean().optional().catch(undefined) }).passthrough())
    .catch([]),
})

/** Valores legacy: el Server guarda strings; se toleran objetos `{ value }`. */
const optionValue = z.union([z.string(), z.object({ value: z.string() }).transform((o) => o.value)])

export const serverProductDetailSchema = z.object({
  product: serverProductSchema,
  variants: z.array(serverVariantSchema),
  options: z.array(z.object({ name: z.string(), values: z.array(optionValue).catch([]) })).catch([]),
  optionAxes: z
    .array(z.object({
      id: z.string().optional(),
      name: z.string(),
      position: z.number().optional(),
      values: z.array(z.object({
        id: z.string().optional(),
        optionId: z.string().optional(),
        value: z.string(),
        slug: z.string().optional(),
        position: z.number().optional(),
      })).catch([])
    }))
    .nullable()
    .catch(null),
})

export const serverProductMutationSchema = z.object({ product: serverProductSchema })

// ---------- Modelo hacia el navegador ----------

export type ProductStatus = 'active' | 'inactive'

export interface ProductRow {
  id: string
  name: string
  slug: string
  categoryId: string | null
  categoryName: string | null
  subcategoryId: string | null
  subcategoryName: string | null
  brand: string | null
  status: ProductStatus
  taxRate: number | null
  updatedAt: string | null
}

export interface ProductList {
  items: ProductRow[]
  pagination: AdminPaginationMeta
}

export interface VariantRow {
  sku: string
  label: string
  options: Record<string, string>
  barcode: string | null
  price: number
  compareAtPrice: number | null
  currency: string
  stock: number
  reserved: number
  available: number
  isPerOrder: boolean
}

export interface ProductDetail extends ProductRow {
  description: string | null
  createdAt: string | null
  variants: VariantRow[]
  /** Ejes de opción del producto (normalizados o legacy). Vacío = opciones libres. */
  optionAxes: OptionAxis[]
}

export function variantLabel(options: Record<string, string>): string {
  const values = Object.values(options).filter(Boolean)
  return values.length ? values.join(' · ') : 'Única'
}
