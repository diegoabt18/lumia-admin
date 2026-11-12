import { z } from 'zod'
import type { AdminPaginationMeta } from '../contracts/api'

/** Paginación del Server (buildPaginationMeta). Validada contra el contrato oficial AdminPaginationMeta. */
export const paginationSchema: z.ZodType<AdminPaginationMeta> = z.object({
  page: z.number().int().min(1),
  limit: z.number().int().min(1),
  total: z.number().int().min(0),
  totalPages: z.number().int().min(1),
  hasNext: z.boolean(),
  hasPrev: z.boolean(),
})

/** Slug en kebab-case: misma regla que adminCategorySchema/adminProductCreateSchema del Server. */
export const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

export const slugField = z
  .string({ required_error: 'Ingresa el identificador (slug).' })
  .trim()
  .min(1, 'Ingresa el identificador (slug).')
  .max(120, 'Máximo 120 caracteres.')
  .regex(SLUG_PATTERN, 'Usa solo minúsculas, números y guiones (ej. velas-aromaticas).')

/** SKU: misma regla que adminVariantCreateSchema del Server. */
export const SKU_PATTERN = /^[A-Za-z0-9._-]{1,80}$/

/** ObjectId de MongoDB (24 hex). */
export const OBJECT_ID_PATTERN = /^[a-f0-9]{24}$/i

/** Genera un slug sugerido a partir de un nombre (solo ayuda de UI; el Server valida). */
export function slugify(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 120)
}

/** Fecha ISO tolerante: el Server serializa Date o string. */
export const isoDate = z
  .union([z.string(), z.date()])
  .transform((v) => (v instanceof Date ? v.toISOString() : v))
  .nullable()
  .optional()
  .catch(null)
