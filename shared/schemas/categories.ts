import { z } from 'zod'
import type { AdminPaginationMeta } from '../contracts/api'
import { isoDate, paginationSchema, slugField } from './common'

/**
 * Categorías. Fuente en el Server:
 * - Rutas: server/src/routes/admin.routes.ts (`/admin/categories`, permisos categories.*)
 * - Entrada: adminCategorySchema (server/src/modules/admin/schemas/admin.schema.ts)
 * - Salida: AdminCategoryService.list/create/update (CategoryDomain + productCount)
 */

export const categoryInputSchema = z.object({
  name: z
    .string({ required_error: 'Ingresa el nombre.' })
    .trim()
    .min(1, 'Ingresa el nombre.')
    .max(120, 'Máximo 120 caracteres.'),
  slug: slugField,
})
export type CategoryInput = z.infer<typeof categoryInputSchema>

export const categoryPatchSchema = categoryInputSchema
  .partial()
  .refine((o) => Object.keys(o).length > 0, { message: 'No hay cambios para guardar.' })
export type CategoryPatch = z.infer<typeof categoryPatchSchema>

const serverCategorySchema = z.object({
  id: z.string(),
  name: z.string(),
  slug: z.string(),
  createdAt: isoDate,
  productCount: z.number().int().min(0).optional().default(0),
})

export const serverCategoryListSchema = z.object({
  categories: z.array(serverCategorySchema),
  pagination: paginationSchema,
})

export const serverCategoryMutationSchema = z.object({ category: serverCategorySchema.omit({ productCount: true }) })

export interface CategoryRow {
  id: string
  name: string
  slug: string
  createdAt: string | null
  productCount: number
}

export interface CategoryList {
  items: CategoryRow[]
  pagination: AdminPaginationMeta
}
