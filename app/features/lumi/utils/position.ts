/**
 * Geometría del icono de Lumi. La posición se guarda como distancias desde la esquina
 * inferior derecha (right/bottom), así las áreas seguras móviles se suman con CSS
 * `env(safe-area-inset-*)` y el icono nunca queda detrás de la muesca o la barra del sistema.
 */

export interface LumiOffset {
  right: number
  bottom: number
}

export interface SafeAreaInsets {
  top: number
  right: number
  bottom: number
  left: number
}

export interface ViewportSize {
  width: number
  height: number
}

export const LUMI_LAUNCHER_SIZE = 56
export const LUMI_EDGE_MARGIN = 12
export const LUMI_DEFAULT_OFFSET: LumiOffset = { right: 20, bottom: 20 }
export const LUMI_POSITION_STORAGE_KEY = 'lumia-admin:lumi-position:v1'

export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}

/** Mantiene el icono dentro del viewport y de las áreas seguras. */
export function clampOffset(
  offset: LumiOffset,
  viewport: ViewportSize,
  insets: SafeAreaInsets,
  size = LUMI_LAUNCHER_SIZE,
  margin = LUMI_EDGE_MARGIN,
): LumiOffset {
  const minRight = margin + insets.right
  const maxRight = Math.max(minRight, viewport.width - size - margin - insets.left)
  const minBottom = margin + insets.bottom
  const maxBottom = Math.max(minBottom, viewport.height - size - margin - insets.top)
  return {
    right: clamp(offset.right, minRight, maxRight),
    bottom: clamp(offset.bottom, minBottom, maxBottom),
  }
}

/** Valida lo leído de localStorage. Cualquier valor raro se descarta. */
export function parseOffset(raw: unknown): LumiOffset | null {
  if (typeof raw !== 'object' || raw === null) return null
  const { right, bottom } = raw as Record<string, unknown>
  if (typeof right !== 'number' || typeof bottom !== 'number') return null
  if (!Number.isFinite(right) || !Number.isFinite(bottom)) return null
  return { right, bottom }
}

/**
 * Lee las áreas seguras que el navegador resuelve para `env(safe-area-inset-*)`.
 * Sin soporte (escritorio o SSR) devuelve ceros.
 */
export function readSafeAreaInsets(): SafeAreaInsets {
  const zero: SafeAreaInsets = { top: 0, right: 0, bottom: 0, left: 0 }
  if (typeof window === 'undefined' || typeof document === 'undefined' || !document.body) return zero
  try {
    const probe = document.createElement('div')
    probe.setAttribute('aria-hidden', 'true')
    probe.style.cssText =
      'position:fixed;visibility:hidden;pointer-events:none;top:0;left:0;' +
      'padding-top:env(safe-area-inset-top,0px);padding-right:env(safe-area-inset-right,0px);' +
      'padding-bottom:env(safe-area-inset-bottom,0px);padding-left:env(safe-area-inset-left,0px);'
    document.body.appendChild(probe)
    const style = window.getComputedStyle(probe)
    const read = (value: string) => {
      const n = Number.parseFloat(value)
      return Number.isFinite(n) ? n : 0
    }
    const insets = {
      top: read(style.paddingTop),
      right: read(style.paddingRight),
      bottom: read(style.paddingBottom),
      left: read(style.paddingLeft),
    }
    probe.remove()
    return insets
  } catch {
    return zero
  }
}
