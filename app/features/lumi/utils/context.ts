import type { LumiContextInput, LumiPage } from '#shared/schemas/lumi'

/**
 * Contexto de pantalla: a partir de la ruta actual se indica a Lumi dónde está el administrador.
 * El navegador solo envía el tipo de vista y el identificador; el Server decide qué datos leer
 * (con el permiso del usuario) y devuelve un resumen acotado.
 */

const OBJECT_ID = /^[a-f0-9]{24}$/i

const PAGE_BY_PATH: Record<string, LumiPage> = {
  '/dashboard': 'dashboard',
  '/analytics': 'analytics',
  '/inventory': 'inventory',
  '/store-settings': 'settings',
  '/products': 'products',
  '/orders': 'orders',
}

export function lumiContextForPath(path: string): LumiContextInput | null {
  const clean = path.split('?')[0]?.split('#')[0]?.replace(/\/+$/, '') || '/'

  const product = clean.match(/^\/products\/([^/]+)$/)
  if (product?.[1] && OBJECT_ID.test(product[1])) return { kind: 'product', id: product[1] }

  const order = clean.match(/^\/orders\/([^/]+)$/)
  if (order?.[1] && OBJECT_ID.test(order[1])) return { kind: 'order', id: order[1] }

  const page = PAGE_BY_PATH[clean]
  return page ? { kind: 'page', page } : null
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
}

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
  if (context?.kind === 'page') {
    if (context.page === 'analytics') return ['¿Qué indicadores debería revisar en esta vista?']
    if (context.page === 'inventory') return ['¿Qué revisar primero en el inventario?']
    if (context.page === 'dashboard') return ['¿Qué debería revisar hoy en el panel?']
  }
  return [
    'Redacta una respuesta amable para un cliente que pregunta por el envío.',
    'Propón un título corto y comercial para un producto artesanal.',
    'Revisa la ortografía de este texto: ',
  ]
}
