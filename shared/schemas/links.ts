import { z } from 'zod'

/**
 * URLs que terminan publicadas en la tienda (banners, promociones).
 *
 * La tienda las usa como `NuxtLink :to` e `<img src>`. El Server solo exige que sean texto; para
 * evitar esquemas peligrosos (javascript:, data:) y redirecciones abiertas (`//otro-sitio`), el
 * BFF acepta únicamente https:// o rutas internas de la tienda.
 */

function isHttpsUrl(value: string): boolean {
  try {
    const url = new URL(value)
    return url.protocol === 'https:' && Boolean(url.hostname) && !url.username && !url.password
  } catch {
    return false
  }
}

/** Ruta interna: empieza por una sola "/", sin barras invertidas ni espacios ni caracteres de control. */
export function isInternalPath(value: string): boolean {
  return /^\/(?!\/)[^\s\\]*$/.test(value) && !/[\u0000-\u001f\u007f]/.test(value)
}

/** Imagen pública: solo https. */
export const httpsImageUrl = z
  .string()
  .trim()
  .max(2000, 'Máximo 2000 caracteres.')
  .refine(isHttpsUrl, 'Usa una URL https:// válida.')

/** Enlace de destino: ruta interna (/products?...) o URL https://. */
export const safeLinkHref = z
  .string()
  .trim()
  .max(2000, 'Máximo 2000 caracteres.')
  .refine((v) => isInternalPath(v) || isHttpsUrl(v), 'Usa una ruta interna (ej. /products?category=velas) o una URL https://.')
