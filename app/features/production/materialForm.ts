import type { MaterialDetail } from '#shared/schemas/production'

/** Valores del formulario de material (los números se editan como texto). */
export interface MaterialFormState {
  name: string
  code: string
  category: string
  description: string
  imagePath: string
  active: boolean
  purchaseUnit: string
  contentUnit: string
  contentQuantity: string
  stockEnabled: boolean
  stockCurrent: string
  stockMinimum: string
  stockUnit: string
}

export function emptyMaterialForm(): MaterialFormState {
  return {
    name: '',
    code: '',
    category: '',
    description: '',
    imagePath: '',
    active: true,
    purchaseUnit: '',
    contentUnit: '',
    contentQuantity: '',
    stockEnabled: false,
    stockCurrent: '',
    stockMinimum: '',
    stockUnit: '',
  }
}

const str = (v: number | null | undefined) => (v === null || v === undefined ? '' : String(v))

export function materialToForm(m: MaterialDetail): MaterialFormState {
  return {
    name: m.name,
    code: m.code ?? '',
    category: m.category,
    description: m.description ?? '',
    imagePath: m.imagePath ?? '',
    active: m.active,
    purchaseUnit: m.purchaseUnit,
    contentUnit: m.contentUnit ?? '',
    contentQuantity: str(m.contentQuantity),
    stockEnabled: m.stockEnabled,
    stockCurrent: str(m.stockCurrent),
    stockMinimum: str(m.stockMinimum),
    stockUnit: m.stockUnit ?? '',
  }
}

/** Vue convierte a number los `<input type="number">` con v-model; por eso se acepta number también. */
const num = (v: string | number | null | undefined): number | undefined => {
  if (typeof v === 'number') return Number.isFinite(v) ? v : undefined
  const text = (v ?? '').trim()
  return text === '' ? undefined : Number(text.replace(',', '.'))
}
const opt = (v: string) => (v === '' ? undefined : v)

/** Cuerpo completo (alta). Los vacíos se omiten. */
export function materialFormToBody(f: MaterialFormState): Record<string, unknown> {
  const body: Record<string, unknown> = {
    name: f.name,
    code: f.code.trim() || undefined,
    category: opt(f.category),
    description: f.description.trim() || undefined,
    imagePath: f.imagePath.trim() || undefined,
    active: f.active,
    purchaseUnit: opt(f.purchaseUnit),
    contentUnit: opt(f.contentUnit),
    contentQuantity: num(f.contentQuantity),
    stockEnabled: f.stockEnabled,
    stockCurrent: num(f.stockCurrent),
    stockMinimum: num(f.stockMinimum),
    stockUnit: opt(f.stockUnit),
  }
  return Object.fromEntries(Object.entries(body).filter(([, v]) => v !== undefined))
}

/**
 * Solo los campos que cambiaron. Los textos vacíos se envían como '' (el Server los borra);
 * los números vacíos no se envían porque el Server no permite vaciarlos.
 */
export function materialFormDiff(f: MaterialFormState, original: MaterialFormState): Record<string, unknown> {
  const patch: Record<string, unknown> = {}
  for (const key of ['name', 'code', 'description', 'imagePath'] as const) {
    if (f[key].trim() !== original[key].trim()) patch[key] = f[key].trim()
  }
  for (const key of ['category', 'purchaseUnit', 'contentUnit', 'stockUnit'] as const) {
    if (f[key] !== original[key] && f[key] !== '') patch[key] = f[key]
  }
  for (const key of ['active', 'stockEnabled'] as const) {
    if (f[key] !== original[key]) patch[key] = f[key]
  }
  for (const key of ['contentQuantity', 'stockCurrent', 'stockMinimum'] as const) {
    const value = num(f[key])
    if (value !== undefined && f[key].trim() !== original[key].trim()) patch[key] = value
  }
  return patch
}
