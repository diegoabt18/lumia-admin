import { z } from 'zod'
import type { AdminPaginationMeta } from '../contracts/api'
import { isoDate, paginationSchema, slugField } from './common'

/**
 * Categorías y subcategorías. Fuente en el Server:
 * - Rutas: server/src/routes/admin.routes.ts (`/admin/categories`, `/admin/categories/:id/subcategories`,
 *   `/admin/subcategories/:id`; permisos categories.*)
 * - Entrada: adminCategorySchema / adminSubcategorySchema (server/src/modules/admin/schemas/admin.schema.ts)
 * - Salida: AdminCategoryService (CategoryDomain/SubcategoryDomain + contadores)
 *
 * Jerarquía: Categoría → Subcategoría → Producto. Una subcategoría pertenece a exactamente una categoría.
 */

export const catalogStatusSchema = z.enum(['active', 'inactive'])
export type CatalogStatus = z.infer<typeof catalogStatusSchema>

/** Fecha ISO o null (nunca undefined) para el modelo del navegador. */
const dateOrNull = isoDate.transform((v) => v ?? null)

const descriptionField = z
  .string()
  .trim()
  .max(2000, 'Máximo 2000 caracteres.')

const nameField = z
  .string({ required_error: 'Ingresa el nombre.' })
  .trim()
  .min(1, 'Ingresa el nombre.')
  .max(120, 'Máximo 120 caracteres.')

/** Cuerpo de alta/edición de categoría (snake_case: tal cual lo espera el Server). */
export const categoryInputSchema = z.object({
  name: nameField,
  slug: slugField,
  description: descriptionField.optional(),
  status: catalogStatusSchema.optional(),
  sort_order: z.number().int().min(0).max(100000).optional(),
})
export type CategoryInput = z.infer<typeof categoryInputSchema>

export const categoryPatchSchema = categoryInputSchema
  .partial()
  .refine((o) => Object.keys(o).length > 0, { message: 'No hay cambios para guardar.' })
export type CategoryPatch = z.infer<typeof categoryPatchSchema>

export const categoryStatusBodySchema = z.object({ status: catalogStatusSchema })

/** Subcategorías usan el mismo contrato que las categorías. */
export const subcategoryInputSchema = categoryInputSchema
export type SubcategoryInput = z.infer<typeof subcategoryInputSchema>

export const subcategoryPatchSchema = categoryPatchSchema

// ---------- Respuestas del Server ----------

const serverCategorySchema = z.object({
  id: z.string(),
  name: z.string(),
  slug: z.string(),
  description: z.string().nullable().catch(null),
  imagePath: z.string().nullable().catch(null),
  status: catalogStatusSchema.catch('active'),
  sortOrder: z.number().int().catch(0),
  createdAt: dateOrNull,
  updatedAt: dateOrNull,
  subcategoryCount: z.number().int().min(0).catch(0),
  activeSubcategoryCount: z.number().int().min(0).catch(0),
  productCount: z.number().int().min(0).catch(0),
  unclassifiedProductCount: z.number().int().min(0).catch(0),
})

const serverSubcategorySchema = z.object({
  id: z.string(),
  categoryId: z.string(),
  name: z.string(),
  slug: z.string(),
  description: z.string().nullable().catch(null),
  imagePath: z.string().nullable().catch(null),
  status: catalogStatusSchema.catch('active'),
  sortOrder: z.number().int().catch(0),
  createdAt: dateOrNull,
  updatedAt: dateOrNull,
  productCount: z.number().int().min(0).catch(0),
})

export const serverCategoryListSchema = z.object({
  categories: z.array(serverCategorySchema),
  pagination: paginationSchema,
})

export const serverCategoryMutationSchema = z.object({ category: serverCategorySchema })
export const serverCategoryDetailSchema = z.object({
  category: serverCategorySchema,
  subcategories: z.array(serverSubcategorySchema),
})
export const serverSubcategoryListSchema = z.object({
  subcategories: z.array(serverSubcategorySchema),
})

/** Listado global: cada subcategoría con el nombre de su categoría. */
export const serverSubcategoryRowListSchema = z.object({
  subcategories: z.array(
    serverSubcategorySchema.extend({
      categoryName: z.string().catch('—'),
      categorySlug: z.string().nullable().catch(null),
    }),
  ),
  pagination: paginationSchema,
})
export const serverSubcategoryMutationSchema = z.object({ subcategory: serverSubcategorySchema })

// ---------- Modelo hacia el navegador ----------

export interface CategoryRow {
  id: string
  name: string
  slug: string
  description: string | null
  imagePath: string | null
  status: CatalogStatus
  sortOrder: number
  createdAt: string | null
  updatedAt: string | null
  subcategoryCount: number
  activeSubcategoryCount: number
  /** Productos dentro de sus subcategorías. */
  productCount: number
  /** Productos sin subcategoría: pendientes de clasificar. */
  unclassifiedProductCount: number
}

export interface CategoryList {
  items: CategoryRow[]
  pagination: AdminPaginationMeta
}

export interface SubcategoryRow {
  id: string
  categoryId: string
  name: string
  slug: string
  description: string | null
  imagePath: string | null
  status: CatalogStatus
  sortOrder: number
  createdAt: string | null
  updatedAt: string | null
  productCount: number
}

export interface SubcategoryListRow extends SubcategoryRow {
  categoryName: string
  categorySlug: string | null
}

export interface SubcategoryList {
  items: SubcategoryListRow[]
  pagination: AdminPaginationMeta
}

export interface CategoryDetail {
  category: CategoryRow
  subcategories: SubcategoryRow[]
}
