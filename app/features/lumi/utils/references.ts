import { PERMISSIONS, type PermissionId } from '#shared/auth/permissions'
import type { LumiReference } from '#shared/schemas/lumi'

/**
 * Referencias de Lumi → destinos del admin.
 *
 * El Server envía `entity` + `id` (o `module`), nunca una ruta. Esta tabla cerrada es el único
 * sitio donde se construyen rutas: un tipo que no esté aquí no se puede abrir. El permiso es el
 * mismo que declara la página de destino (definePageMeta); aquí solo sirve para no ofrecer un
 * enlace que el guard rechazaría. El Server vuelve a autorizar al cargar el registro.
 */

type EntityRef = Extract<LumiReference, { type: 'admin_entity' }>
type ModuleRef = Extract<LumiReference, { type: 'admin_module' }>
export type WebSourceRef = Extract<LumiReference, { type: 'web_source' }>

const OBJECT_ID = /^[a-f0-9]{24}$/i

const ENTITY_TARGETS: Record<EntityRef['entity'], { base: string; noun: string; permission: PermissionId }> = {
  product: { base: '/products', noun: 'producto', permission: PERMISSIONS.PRODUCTS_READ },
  category: { base: '/categories', noun: 'categoría', permission: PERMISSIONS.CATEGORIES_READ },
  order: { base: '/orders', noun: 'pedido', permission: PERMISSIONS.ORDERS_READ },
  promotion: { base: '/promotions', noun: 'promoción', permission: PERMISSIONS.PROMOTIONS_READ },
}

const MODULE_TARGETS: Record<ModuleRef['module'], { to: string; name: string; permission: PermissionId }> = {
  dashboard: { to: '/dashboard', name: 'Dashboard', permission: PERMISSIONS.ADMIN_ACCESS },
  analytics: { to: '/analytics', name: 'Analítica', permission: PERMISSIONS.ANALYTICS_READ },
  orders: { to: '/orders', name: 'Pedidos', permission: PERMISSIONS.ORDERS_READ },
  products: { to: '/products', name: 'Productos', permission: PERMISSIONS.PRODUCTS_READ },
  inventory: { to: '/inventory', name: 'Inventario', permission: PERMISSIONS.INVENTORY_READ },
  categories: { to: '/categories', name: 'Categorías', permission: PERMISSIONS.CATEGORIES_READ },
  promotions: { to: '/promotions', name: 'Promociones', permission: PERMISSIONS.PROMOTIONS_READ },
  notifications: { to: '/lumi/notificaciones', name: 'Notificaciones', permission: PERMISSIONS.LUMI_USE },
  initiatives: { to: '/lumi/iniciativas', name: 'Iniciativas', permission: PERMISSIONS.LUMI_USE },
  automations: { to: '/lumi/automatizaciones', name: 'Automatizaciones', permission: PERMISSIONS.LUMI_USE },
}

const REPORT_TARGETS = {
  sales: { to: '/analytics', name: 'Analítica', permission: PERMISSIONS.ANALYTICS_READ },
} as const satisfies Record<Extract<LumiReference, { type: 'report' }>['report'], { to: string; name: string; permission: PermissionId }>

/** Acceso interno ya resuelto. `to` es null cuando no se puede abrir (sin permiso o sin destino). */
export interface ResolvedLink {
  key: string
  to: string | null
  /** Texto accesible y de ayuda: «Ver categoría Baby Shower». */
  title: string
  label: string
  reason: 'ok' | 'forbidden'
}

type Can = (permission: PermissionId) => boolean

export function resolveEntity(ref: EntityRef, can: Can): ResolvedLink {
  const target = ENTITY_TARGETS[ref.entity]
  const allowed = can(target.permission) && OBJECT_ID.test(ref.id)
  return {
    key: `e:${ref.entity}:${ref.id}`,
    to: allowed ? `${target.base}/${ref.id}` : null,
    title: allowed ? `Ver ${target.noun} ${ref.label}` : `No tienes permiso para abrir este registro (${target.noun})`,
    label: ref.label,
    reason: allowed ? 'ok' : 'forbidden',
  }
}

/** Módulos, informes y resultados de operaciones: abren la pantalla del módulo. */
export function resolveModuleLink(ref: Exclude<LumiReference, EntityRef | WebSourceRef>, can: Can): ResolvedLink {
  const target = ref.type === 'report' ? REPORT_TARGETS[ref.report] : MODULE_TARGETS[ref.module]
  const allowed = can(target.permission)
  const key = ref.type === 'report' ? `r:${ref.report}` : `${ref.type === 'operation' ? 'o' : 'm'}:${ref.module}`
  return {
    key,
    to: allowed ? target.to : null,
    title: allowed ? `Abrir ${target.name}` : `No tienes permiso para abrir ${target.name}`,
    label: ref.label,
    reason: allowed ? 'ok' : 'forbidden',
  }
}

/* ───────────────────────── Texto → bloques ───────────────────────── */

/** Trozo de una línea: texto normal o una cita `[n]`. */
export type InlinePart = { kind: 'text'; text: string } | { kind: 'cite'; index: number; source: WebSourceRef | null }

export interface MessageLine {
  key: string
  /** Prefijo de lista tal como vino («- », «1. ») o vacío. */
  marker: string
  indent: string
  parts: InlinePart[]
  /** Registro de esta línea (icono de ojo). */
  entity: EntityRef | null
}

export interface MessageLayout {
  lines: MessageLine[]
  /** Registros que no se pudieron ubicar en una línea concreta: se ofrecen al final. */
  extraEntities: EntityRef[]
  modules: Array<Exclude<LumiReference, EntityRef | WebSourceRef>>
  sources: WebSourceRef[]
}

const LIST_ITEM = /^(\s*)((?:[-*•]|\d{1,3}[.)])\s+)(.*)$/
const CITATION = /\[(\d{1,2})\]/g

/** ¿La línea empieza por la etiqueta del registro, como palabra completa? */
function startsWithLabel(text: string, label: string): boolean {
  if (!text.startsWith(label)) return false
  const next = text.charAt(label.length)
  return next === '' || !/[\p{L}\p{N}]/u.test(next)
}

function splitCitations(text: string, sources: ReadonlyMap<number, WebSourceRef>, withCitations: boolean): InlinePart[] {
  if (!withCitations) return text ? [{ kind: 'text', text }] : []
  const parts: InlinePart[] = []
  let last = 0
  for (const match of text.matchAll(CITATION)) {
    const index = Number(match[1])
    const start = match.index ?? 0
    if (start > last) parts.push({ kind: 'text', text: text.slice(last, start) })
    parts.push({ kind: 'cite', index, source: sources.get(index) ?? null })
    last = start + match[0].length
  }
  if (last < text.length) parts.push({ kind: 'text', text: text.slice(last) })
  return parts
}

/**
 * Divide la respuesta en líneas y ubica cada registro en la línea de lista que empieza por su
 * etiqueta (el Server usa la misma etiqueta que escribe en el texto). Los registros se consumen en
 * orden, así dos productos con el mismo nombre quedan cada uno en su línea. No interpreta HTML ni
 * Markdown: el texto se sigue mostrando como texto.
 */
export function layoutMessage(content: string, references: readonly LumiReference[]): MessageLayout {
  const entities = references.filter((r): r is EntityRef => r.type === 'admin_entity')
  const sources = references.filter((r): r is WebSourceRef => r.type === 'web_source')
  const modules = references.filter(
    (r): r is Exclude<LumiReference, EntityRef | WebSourceRef> => r.type === 'admin_module' || r.type === 'report' || r.type === 'operation',
  )
  const byIndex = new Map(sources.map((s) => [s.index, s]))
  // Sin fuentes no hay citas que enlazar: «[1]» se deja como texto.
  const withCitations = sources.length > 0
  const used = new Set<number>()

  const lines = content.split('\n').map((raw, i): MessageLine => {
    const item = LIST_ITEM.exec(raw)
    const indent = item?.[1] ?? ''
    const marker = item?.[2] ?? ''
    const body = item ? (item[3] ?? '') : raw
    let entity: EntityRef | null = null
    if (item) {
      // La etiqueta más larga gana: «Velas Aromáticas (11)» no es la línea de «Velas».
      let found = -1
      entities.forEach((e, idx) => {
        if (used.has(idx) || !startsWithLabel(body, e.label)) return
        if (found < 0 || e.label.length > (entities[found]?.label.length ?? 0)) found = idx
      })
      if (found >= 0) {
        used.add(found)
        entity = entities[found] ?? null
      }
    }
    return { key: `l${i}`, marker, indent, parts: splitCitations(body, byIndex, withCitations), entity }
  })

  // Una respuesta sobre un solo registro («Pedido ORD-… :») no lo tiene en una línea de lista.
  const extraEntities = entities.filter((_, idx) => !used.has(idx))
  return { lines, extraEntities, modules, sources: [...sources].sort((a, b) => a.index - b.index) }
}
