import type { LumiContextInput, LumiPage } from '#shared/schemas/lumi'

/**
 * Contexto de pantalla: a partir de la ruta actual se indica a Lumi dónde está el administrador.
 * El navegador solo envía el tipo de vista y el identificador; el Server decide qué datos leer
 * (con el permiso del usuario) y devuelve un resumen acotado.
 */

const OBJECT_ID = /^[a-f0-9]{24}$/i

/** Vistas de listado o de módulo: la ruta exacta corresponde a una página de Lumi. */
const PAGE_BY_PATH: Record<string, LumiPage> = {
  '/dashboard': 'dashboard',
  '/analytics': 'analytics',
  '/inventory': 'inventory',
  '/store-settings': 'settings',
  '/products': 'products',
  '/orders': 'orders',
  '/categories': 'categories',
  '/subcategories': 'subcategories',
  '/promotions': 'promotions',
  '/banners': 'banners',
  '/images': 'images',
  '/feedback': 'reviews',
  '/lumi/automatizaciones': 'automations',
  '/lumi/iniciativas': 'initiatives',
}

/**
 * Módulos cuyo resumen vale para todas sus subvistas: el Server envía las cifras generales del
 * módulo, no las del registro abierto.
 */
const PAGE_BY_PREFIX: ReadonlyArray<readonly [string, LumiPage]> = [['/production', 'production']]

export function lumiContextForPath(path: string): LumiContextInput | null {
  const clean = path.split('?')[0]?.split('#')[0]?.replace(/\/+$/, '') || '/'

  const product = clean.match(/^\/products\/([^/]+)$/)
  if (product?.[1] && OBJECT_ID.test(product[1])) return { kind: 'product', id: product[1] }

  const order = clean.match(/^\/orders\/([^/]+)$/)
  if (order?.[1] && OBJECT_ID.test(order[1])) return { kind: 'order', id: order[1] }

  const page = PAGE_BY_PATH[clean]
  if (page) return { kind: 'page', page }

  const prefixed = PAGE_BY_PREFIX.find(([prefix]) => clean === prefix || clean.startsWith(`${prefix}/`))
  return prefixed ? { kind: 'page', page: prefixed[1] } : null
}

/** Etiqueta breve para mostrar en el panel. No incluye datos del producto ni del pedido. */
export function lumiContextLabel(context: LumiContextInput): string {
  if (context.kind === 'product') return 'Producto abierto'
  if (context.kind === 'order') return 'Pedido abierto'
  return PAGE_LABELS[context.page]
}

const PAGE_LABELS: Record<LumiPage, string> = {
  dashboard: 'Dashboard',
  analytics: 'Analítica',
  inventory: 'Inventario',
  settings: 'Configuración de la tienda',
  products: 'Productos',
  orders: 'Pedidos',
  categories: 'Categorías',
  subcategories: 'Subcategorías',
  promotions: 'Promociones',
  banners: 'Banners',
  images: 'Imágenes',
  reviews: 'Reseñas y preguntas',
  production: 'Producción y costeo',
  automations: 'Automatizaciones',
  initiatives: 'Iniciativas',
}

/**
 * Sugerencias por vista. Las de dashboard, analítica, inventario y pedidos las resuelve una
 * herramienta del Server con datos reales; las demás las responde el modelo con el resumen de
 * la pantalla que arma el Server.
 */
const PAGE_PROMPTS: Partial<Record<LumiPage, readonly string[]>> = {
  analytics: ['¿Cuánto vendimos esta semana?', '¿Cuáles son los productos más vendidos este mes?'],
  inventory: ['¿Qué productos se están agotando?'],
  orders: ['¿Cuántos pedidos tengo por despachar?', 'Muéstrame los últimos 5 pedidos'],
  dashboard: ['¿Cuánto vendimos hoy?', '¿Qué iniciativas urgentes tengo?'],
  products: ['Resume los productos de esta lista.', '¿Qué productos están inactivos o sin categoría?'],
  categories: [
    'Resume el estado de las categorías.',
    '¿Qué categorías tienen productos sin subcategoría?',
  ],
  subcategories: ['Resume el estado de las subcategorías.', '¿Qué subcategorías no tienen productos?'],
  promotions: ['¿Qué promociones están vigentes ahora?', '¿Qué promociones terminan pronto?'],
  banners: ['¿Qué banners están visibles en la tienda?', '¿Hay banners vencidos o desactivados?'],
  images: ['¿Qué tamaño y formato conviene para las fotos de producto?'],
  reviews: ['Redacta una respuesta amable para una reseña negativa.', '¿Cuándo conviene ocultar una reseña?'],
  production: [
    'Resume el estado de producción y costos.',
    '¿Qué materiales cambiaron de costo esta semana?',
  ],
  automations: ['¿Qué tipo de tareas puedo automatizar con Lumi?'],
  initiatives: ['¿Cómo priorizo las iniciativas de Lumi?'],
}

const GENERAL_PROMPTS = [
  'Redacta una respuesta amable para un cliente que pregunta por el envío.',
  'Propón un título corto y comercial para un producto artesanal.',
  'Revisa la ortografía de este texto: ',
] as const

/** Sugerencias según la pantalla. Son peticiones generales: el contexto lo aporta el Server. */
export function lumiQuickPrompts(context: LumiContextInput | null): readonly string[] {
  if (context?.kind === 'product') {
    return [
      'Resume el estado de este producto.',
      'Propón una descripción corta y comercial para este producto.',
    ]
  }
  if (context?.kind === 'order') {
    return ['Resume el estado de este pedido.', '¿Qué pasos faltan para entregar este pedido?']
  }
  if (context?.kind === 'page') return PAGE_PROMPTS[context.page] ?? GENERAL_PROMPTS
  return GENERAL_PROMPTS
}
