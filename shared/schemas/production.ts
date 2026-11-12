import { z } from 'zod'
import type { AdminPaginationMeta } from '../contracts/api'
import { isoDate } from './common'

/**
 * Producción: materiales, proveedores y unidades. Fuente en el Server:
 * - Rutas: server/src/routes/production-admin.routes.ts (`/admin/production/*`)
 * - Entrada: server/src/modules/production/schemas/production.schema.ts
 * - Salida: toMaterialDomain, toSupplierDomain, toUnitDomain, toMaterialPriceDomain (domain/*.entity.ts)
 * - Los listados responden `{ data, meta: { total, page, pageSize, totalPages } }` (no el formato
 *   de paginación del resto del admin): el BFF lo convierte.
 * - El Server elimina `null` del cuerpo antes de validar (stripNulls): para vaciar un texto se envía ''.
 *   Los números opcionales no se pueden vaciar una vez guardados.
 */

// ---------- Catálogos fijos del Server ----------

export const MATERIAL_CATEGORIES = [
  'ceras', 'parafinas', 'fragancias', 'colorantes', 'pabilos',
  'cementos', 'aditivos', 'pegantes', 'cartones', 'papeles',
  'envases', 'empaques', 'decoraciones', 'otros',
] as const
export type MaterialCategory = (typeof MATERIAL_CATEGORIES)[number]

export const MATERIAL_CATEGORY_LABELS: Record<MaterialCategory, string> = {
  ceras: 'Ceras', parafinas: 'Parafinas', fragancias: 'Fragancias', colorantes: 'Colorantes', pabilos: 'Pabilos',
  cementos: 'Cementos', aditivos: 'Aditivos', pegantes: 'Pegantes', cartones: 'Cartones', papeles: 'Papeles',
  envases: 'Envases', empaques: 'Empaques', decoraciones: 'Decoraciones', otros: 'Otros',
}

export const UNITS_OF_MEASURE = [
  'kg', 'g', 'mg', 'l', 'ml', 'm', 'cm', 'mm', 'm2', 'cm2',
  'unidad', 'pliego', 'rollo', 'caja', 'bolsa', 'paquete', 'otro',
] as const
export type UnitOfMeasure = (typeof UNITS_OF_MEASURE)[number]

export const CONTENT_UNITS = ['unidad', 'kg', 'g', 'mg', 'l', 'ml', 'm', 'cm', 'mm', 'm2', 'cm2'] as const

export const UNIT_FAMILIES = ['mass', 'volume', 'length', 'area', 'count', 'other'] as const
export type UnitFamily = (typeof UNIT_FAMILIES)[number]
export const UNIT_FAMILY_LABELS: Record<UnitFamily, string> = {
  mass: 'Masa', volume: 'Volumen', length: 'Longitud', area: 'Área', count: 'Conteo', other: 'Otra',
}

// ---------- Respuestas del Server ----------

const serverListMeta = z.object({
  total: z.number().int().min(0),
  page: z.number().int().min(1),
  pageSize: z.number().int().min(0),
  totalPages: z.number().int().min(0),
})

/** Convierte la paginación de producción al formato del admin. */
export function toAdminPagination(meta: z.infer<typeof serverListMeta>, limit: number): AdminPaginationMeta {
  const totalPages = Math.max(1, meta.totalPages)
  return { page: meta.page, limit, total: meta.total, totalPages, hasNext: meta.page < totalPages, hasPrev: meta.page > 1 }
}

const optText = z.string().nullable().optional()
const optNumber = z.number().nullable().optional()

export const serverMaterialSchema = z.object({
  id: z.string(),
  name: z.string(),
  code: optText,
  category: z.string(),
  description: optText,
  imagePath: optText,
  active: z.boolean().optional().default(true),
  purchaseUnit: z.string(),
  lastCost: z.number().optional().default(0),
  lastCostUnit: optText,
  rollMeters: optNumber,
  contentUnit: optText,
  contentQuantity: optNumber,
  stockEnabled: z.boolean().optional().default(false),
  stockCurrent: optNumber,
  stockMinimum: optNumber,
  stockUnit: optText,
  createdAt: isoDate,
  updatedAt: isoDate,
})
export type ServerMaterial = z.infer<typeof serverMaterialSchema>

export const serverMaterialListSchema = z.object({ data: z.array(serverMaterialSchema), meta: serverListMeta })
export const serverMaterialEnvelopeSchema = z.object({ data: serverMaterialSchema })

const serverMaterialSupplierLink = z.object({
  supplierId: z.string(),
  supplierName: z.string().optional().default(''),
  isPreferred: z.boolean().optional().default(false),
})
export const serverMaterialDetailSchema = z.object({
  data: serverMaterialSchema.extend({ suppliers: z.array(serverMaterialSupplierLink).optional().default([]) }),
})
export const serverMaterialLinksSchema = z.object({
  data: z.object({ suppliers: z.array(serverMaterialSupplierLink) }),
})

export const serverPriceEntrySchema = z.object({
  id: z.string(),
  price: z.number(),
  quantity: z.number(),
  unit: z.string(),
  rolloMeters: optNumber,
  unitCost: z.number(),
  supplierId: optText,
  supplierName: optText,
  notes: optText,
  invoiceNumber: optText,
  recordedBy: z.string().optional().default(''),
  recordedAt: isoDate,
})
export const serverPriceHistorySchema = z.object({ data: z.array(serverPriceEntrySchema) })

export const serverSupplierSchema = z.object({
  id: z.string(),
  name: z.string(),
  contactName: optText,
  phone: optText,
  email: optText,
  notes: optText,
  isFavorite: z.boolean().optional().default(false),
  active: z.boolean().optional().default(true),
  createdAt: isoDate,
  updatedAt: isoDate,
})
export type ServerSupplier = z.infer<typeof serverSupplierSchema>
export const serverSupplierListSchema = z.object({ data: z.array(serverSupplierSchema), meta: serverListMeta })
export const serverSupplierEnvelopeSchema = z.object({ data: serverSupplierSchema })

export const serverUnitSchema = z.object({
  id: z.string(),
  name: z.string(),
  abbreviation: z.string(),
  family: z.enum(UNIT_FAMILIES).catch('other'),
  baseFactor: z.number(),
  active: z.boolean().optional().default(true),
  sortOrder: z.number().optional().default(0),
  updatedAt: isoDate,
})
export type ServerUnit = z.infer<typeof serverUnitSchema>
export const serverUnitListSchema = z.object({ data: z.array(serverUnitSchema) })
export const serverUnitEnvelopeSchema = z.object({ data: serverUnitSchema })

// ---------- Vistas para la interfaz ----------

export interface MaterialRow {
  id: string
  name: string
  code: string | null
  category: string
  active: boolean
  purchaseUnit: string
  lastCost: number
  stockEnabled: boolean
  stockCurrent: number | null
  stockMinimum: number | null
  stockUnit: string | null
  /** true si el stock actual está en o por debajo del mínimo. */
  lowStock: boolean
}

export interface MaterialList {
  items: MaterialRow[]
  pagination: AdminPaginationMeta
}

export interface MaterialDetail extends MaterialRow {
  description: string | null
  imagePath: string | null
  lastCostUnit: string | null
  rollMeters: number | null
  contentUnit: string | null
  contentQuantity: number | null
  suppliers: { supplierId: string; supplierName: string; isPreferred: boolean }[]
  /** true si ya tiene precios registrados: la unidad de compra queda fija. */
  hasPriceHistory: boolean
  updatedAt: string | null
}

export interface PriceEntry {
  id: string
  price: number
  quantity: number
  unit: string
  unitCost: number
  supplierName: string | null
  notes: string | null
  invoiceNumber: string | null
  recordedAt: string | null
}

export interface SupplierRow {
  id: string
  name: string
  contactName: string | null
  phone: string | null
  email: string | null
  notes: string | null
  isFavorite: boolean
  active: boolean
}

export interface SupplierList {
  items: SupplierRow[]
  pagination: AdminPaginationMeta
}

export interface UnitRow {
  id: string
  name: string
  abbreviation: string
  family: UnitFamily
  baseFactor: number
  active: boolean
  sortOrder: number
}

export function toMaterialRow(m: ServerMaterial): MaterialRow {
  const stockCurrent = m.stockCurrent ?? null
  const stockMinimum = m.stockMinimum ?? null
  return {
    id: m.id,
    name: m.name,
    code: m.code?.trim() || null,
    category: m.category,
    active: m.active,
    purchaseUnit: m.purchaseUnit,
    lastCost: m.lastCost,
    stockEnabled: m.stockEnabled,
    stockCurrent,
    stockMinimum,
    stockUnit: m.stockUnit ?? null,
    lowStock: m.stockEnabled && stockCurrent !== null && stockMinimum !== null && stockCurrent <= stockMinimum,
  }
}

export function toSupplierRow(s: ServerSupplier): SupplierRow {
  return {
    id: s.id,
    name: s.name,
    contactName: s.contactName?.trim() || null,
    phone: s.phone?.trim() || null,
    email: s.email?.trim() || null,
    notes: s.notes?.trim() || null,
    isFavorite: s.isFavorite,
    active: s.active,
  }
}

export function toUnitRow(u: ServerUnit): UnitRow {
  return { id: u.id, name: u.name, abbreviation: u.abbreviation, family: u.family, baseFactor: u.baseFactor, active: u.active, sortOrder: u.sortOrder }
}

// ---------- Entrada ----------

const trimmed = (max: number) => z.string().trim().max(max, `Máximo ${max} caracteres.`)
const requiredName = (max: number) =>
  z.string({ required_error: 'Ingresa el nombre.' }).trim().min(1, 'Ingresa el nombre.').max(max, `Máximo ${max} caracteres.`)
const positive = z.number({ invalid_type_error: 'Ingresa un número.' }).positive('Debe ser mayor que 0.').max(1e9)
const nonNegative = z.number({ invalid_type_error: 'Ingresa un número.' }).min(0, 'No puede ser negativo.').max(1e9)

/** Clave lógica de imagen generada en el estudio de imágenes (materials/<slug>). */
export const MATERIAL_IMAGE_KEY_PATTERN = /^materials\/[a-z0-9]+(?:-[a-z0-9]+)*$/

const materialBase = {
  name: requiredName(200),
  code: trimmed(100),
  category: z.enum(MATERIAL_CATEGORIES, { errorMap: () => ({ message: 'Elige una categoría.' }) }),
  description: trimmed(2000),
  imagePath: z.union([z.literal(''), z.string().trim().regex(MATERIAL_IMAGE_KEY_PATTERN, 'Usa la clave del estudio de imágenes (materials/slug).')]),
  active: z.boolean(),
  purchaseUnit: z.enum(UNITS_OF_MEASURE, { errorMap: () => ({ message: 'Elige la unidad de compra.' }) }),
  contentUnit: z.enum(CONTENT_UNITS).optional(),
  contentQuantity: positive.optional(),
  stockEnabled: z.boolean(),
  stockCurrent: nonNegative.optional(),
  stockMinimum: nonNegative.optional(),
  stockUnit: z.enum(UNITS_OF_MEASURE).optional(),
}

const contentPair = (o: { contentUnit?: string; contentQuantity?: number }) =>
  (o.contentUnit === undefined) === (o.contentQuantity === undefined)

/** Alta: sin costo (el costo se registra en el historial de precios para que quede trazado). */
export const materialCreateBodySchema = z
  .object({
    ...materialBase,
    code: materialBase.code.optional(),
    description: materialBase.description.optional(),
    imagePath: materialBase.imagePath.optional(),
    active: materialBase.active.optional(),
    stockEnabled: materialBase.stockEnabled.optional(),
  })
  .strict()
  .refine(contentPair, { message: 'Indica la unidad y la cantidad de contenido, o ninguna.', path: ['contentQuantity'] })
export type MaterialCreateBody = z.infer<typeof materialCreateBodySchema>

export const materialPatchBodySchema = z
  .object(materialBase)
  .partial()
  .strict()
  .refine((o) => Object.keys(o).length > 0, { message: 'No hay cambios para guardar.' })
export type MaterialPatchBody = z.infer<typeof materialPatchBodySchema>

export const priceEntryBodySchema = z
  .object({
    price: z.number({ invalid_type_error: 'Ingresa el precio.' }).min(0.01, 'Debe ser mayor que 0.').max(1e10),
    quantity: z.number({ invalid_type_error: 'Ingresa la cantidad.' }).min(0.01, 'Debe ser mayor que 0.').max(1e7),
    rolloMeters: z.number().min(0.01).max(1e6).optional(),
    supplierId: z.string().regex(/^[a-f0-9]{24}$/i).optional(),
    notes: trimmed(500).optional(),
    invoiceNumber: trimmed(100).optional(),
  })
  .strict()
export type PriceEntryBody = z.infer<typeof priceEntryBodySchema>

export const materialSupplierLinkBodySchema = z
  .object({ supplierId: z.string().regex(/^[a-f0-9]{24}$/i, 'Elige un proveedor.'), isPreferred: z.boolean().optional() })
  .strict()

const supplierBase = {
  name: requiredName(200),
  contactName: trimmed(200),
  phone: z.string().trim().max(50).regex(/^[0-9+()\s-]*$/, 'Usa solo números, espacios, +, - y paréntesis.'),
  email: z.union([z.literal(''), z.string().trim().email('Correo inválido.').max(200)]),
  notes: trimmed(1000),
  isFavorite: z.boolean(),
  active: z.boolean(),
}
export const supplierCreateBodySchema = z.object(supplierBase).partial().required({ name: true }).strict()
export const supplierPatchBodySchema = z
  .object(supplierBase)
  .partial()
  .strict()
  .refine((o) => Object.keys(o).length > 0, { message: 'No hay cambios para guardar.' })
export type SupplierInput = z.infer<typeof supplierCreateBodySchema>

/** Alta de unidad: abreviatura única; familia y factor solo al crear (cambiarlos altera costos ya calculados). */
export const unitCreateBodySchema = z
  .object({
    name: requiredName(100),
    abbreviation: z.string().trim().min(1, 'Ingresa la abreviatura.').max(20).regex(/^[a-z0-9²³]+$/i, 'Solo letras y números.'),
    family: z.enum(UNIT_FAMILIES),
    baseFactor: positive,
    sortOrder: z.number().int().min(0).max(10000).optional(),
  })
  .strict()
export const unitPatchBodySchema = z
  .object({ name: requiredName(100), active: z.boolean(), sortOrder: z.number().int().min(0).max(10000) })
  .partial()
  .strict()
  .refine((o) => Object.keys(o).length > 0, { message: 'No hay cambios para guardar.' })
