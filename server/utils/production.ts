import type { H3Event } from 'h3'
import {
  serverMaterialDetailSchema,
  serverMaterialListSchema,
  serverPriceHistorySchema,
  toMaterialRow,
  type MaterialDetail,
  type PriceEntry,
} from '#shared/schemas/production'
import { parseUpstream } from './request-input'
import { serverApi } from './server-api'
import { throwBffError } from './upstream'

export async function fetchPriceHistory(event: H3Event, id: string): Promise<PriceEntry[]> {
  const data = parseUpstream(
    serverPriceHistorySchema,
    await serverApi(event, `/api/admin/production/materials/${id}/price-history`),
    'GET /admin/production/materials/:id/price-history',
  )
  return data.data.map((p) => ({
    id: p.id,
    price: p.price,
    quantity: p.quantity,
    unit: p.unit,
    unitCost: p.unitCost,
    supplierName: p.supplierName?.trim() || null,
    notes: p.notes?.trim() || null,
    invoiceNumber: p.invoiceNumber?.trim() || null,
    recordedAt: p.recordedAt ?? null,
  }))
}

export async function loadMaterialDetail(event: H3Event, id: string): Promise<{ detail: MaterialDetail; prices: PriceEntry[] }> {
  const [raw, prices] = await Promise.all([
    serverApi(event, `/api/admin/production/materials/${id}`),
    fetchPriceHistory(event, id),
  ])
  const m = parseUpstream(serverMaterialDetailSchema, raw, 'GET /admin/production/materials/:id').data
  return {
    detail: {
      ...toMaterialRow(m),
      description: m.description?.trim() || null,
      imagePath: m.imagePath?.trim() || null,
      lastCostUnit: m.lastCostUnit ?? null,
      rollMeters: m.rollMeters ?? null,
      contentUnit: m.contentUnit ?? null,
      contentQuantity: m.contentQuantity ?? null,
      suppliers: m.suppliers,
      hasPriceHistory: prices.length > 0,
      updatedAt: m.updatedAt ?? null,
    },
    prices,
  }
}

/**
 * El Server solo impide nombres repetidos al crear y con coincidencia exacta (distingue mayúsculas).
 * Aquí se comprueba sin distinguir mayúsculas ni espacios, también al renombrar.
 */
export async function assertUniqueMaterialName(event: H3Event, name: string, exceptId?: string) {
  const data = parseUpstream(
    serverMaterialListSchema,
    await serverApi(event, '/api/admin/production/materials', { query: { search: name, limit: 100, page: 1 } }),
    'GET /admin/production/materials',
  )
  const normalized = name.trim().toLocaleLowerCase('es')
  const clash = data.data.find((m) => m.id !== exceptId && m.name.trim().toLocaleLowerCase('es') === normalized)
  if (clash) {
    throwBffError(409, {
      code: 'MATERIAL_NAME_TAKEN',
      message: `Ya existe un material llamado "${clash.name}".`,
      fieldErrors: { name: ['Ya existe un material con ese nombre.'] },
    })
  }
}
