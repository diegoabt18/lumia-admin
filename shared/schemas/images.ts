import { z } from 'zod'

/**
 * Estudio de imágenes. Fuente en el Server:
 * - Rutas: server/src/routes/images.routes.ts
 *   POST /admin/product-images/generate (products.update), /admin/site-images/generate (products.update),
 *   /admin/production/materials/images/generate (materials.update). Multipart.
 * - Lógica: server/src/modules/images/{image-generation.service,studios,image-presets}.ts
 * - El Server NO guarda nada: devuelve las variantes AVIF + WebP en base64 con su ruta de exportación
 *   (`exportPath`). Hay que descargarlas y subirlas al repositorio de imágenes / CDN.
 */

// ---------- Límites (iguales o más estrictos que el Server) ----------

export const IMAGE_MAX_FILE_BYTES = 12 * 1024 * 1024
export const IMAGE_MAX_GALLERY = 8
/** Tope total del cuerpo multipart en el BFF (el BFF lo guarda en memoria antes de reenviarlo). */
export const IMAGE_MAX_REQUEST_BYTES = 40 * 1024 * 1024

export const IMAGE_ACCEPT = 'image/jpeg,image/png,image/webp,image/avif,image/gif,image/tiff'

// ---------- Configuración del estudio (productImageStudioConfigSchema y equivalentes) ----------

export const imageStudioConfigSchema = z
  .object({
    quality: z.number().int().min(40).max(80),
    fit: z.enum(['contain', 'cover']),
    background: z.enum(['transparent', 'white', 'custom']),
    customHex: z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Usa el formato #RRGGBB.').optional(),
    preserveAlpha: z.boolean(),
    withoutEnlargement: z.boolean(),
  })
  .strict()
  .refine((c) => c.background !== 'custom' || Boolean(c.customHex), {
    message: 'Elige el color de fondo.',
    path: ['customHex'],
  })
export type ImageStudioConfig = z.infer<typeof imageStudioConfigSchema>

export const DEFAULT_IMAGE_CONFIG: ImageStudioConfig = {
  quality: 60,
  fit: 'contain',
  background: 'white',
  customHex: '#ffffff',
  preserveAlpha: false,
  withoutEnlargement: true,
}

// ---------- Tipos de imagen ----------

/** Slug de producto: el Server exige kebab-case estricto. */
export const PRODUCT_IMAGE_SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

export const SITE_IMAGE_KINDS = {
  logo: { label: 'Logo', numbered: false, maxIndex: 1, size: '512 × 512', fit: 'contain', background: 'transparent' },
  home: { label: 'Portada (hero)', numbered: true, maxIndex: 8, size: '1920 × 1080', fit: 'cover', background: 'white' },
  history: { label: 'Historia', numbered: false, maxIndex: 1, size: '1200 × 1500', fit: 'cover', background: 'white' },
  moments: { label: 'Momentos', numbered: true, maxIndex: 12, size: '800 × 800', fit: 'cover', background: 'white' },
} as const
export type SiteImageKind = keyof typeof SITE_IMAGE_KINDS
export const SITE_IMAGE_KIND_IDS = Object.keys(SITE_IMAGE_KINDS) as [SiteImageKind, ...SiteImageKind[]]

/** Configuración por defecto de cada tipo de sitio (defaultSiteStudioConfig del Server). */
export function defaultSiteConfig(kind: SiteImageKind): ImageStudioConfig {
  const meta = SITE_IMAGE_KINDS[kind]
  return {
    ...DEFAULT_IMAGE_CONFIG,
    fit: meta.fit,
    background: meta.background,
    preserveAlpha: meta.background === 'transparent',
  }
}

export const PRODUCT_IMAGE_SIZES = ['thumb 100', 'small 300', 'medium 600', 'large 1024', 'big 1300'] as const
export const MATERIAL_IMAGE_SIZES = ['small 300', 'large 1024'] as const

// ---------- Respuesta ----------

/**
 * Ruta de exportación segura: carpetas y archivo en minúsculas, sin `..` ni rutas absolutas.
 * Se usa como nombre dentro del ZIP que descarga el navegador.
 */
export const EXPORT_PATH_PATTERN = /^[a-z0-9_]+\/(?:[a-z0-9-]+\/)?[a-z0-9_-]+\.(?:avif|webp)$/

const variantSchema = z.object({
  key: z.string().max(40),
  format: z.enum(['avif', 'webp']),
  filename: z.string().regex(/^[a-z0-9_-]+\.(?:avif|webp)$/),
  exportPath: z.string().regex(EXPORT_PATH_PATTERN),
  usage: z.string().max(120),
  width: z.number().int().positive(),
  height: z.number().int().positive(),
  inputBytes: z.number().int().min(0),
  outputBytes: z.number().int().min(0),
  compressionPercent: z.number(),
  base64: z.string().regex(/^[A-Za-z0-9+/]+={0,2}$/),
})
export type ImageVariant = z.infer<typeof variantSchema>

export const serverProductImagesSchema = z.object({
  slug: z.string(),
  imageKey: z.string(),
  main: z.array(variantSchema),
  gallery: z.array(z.array(variantSchema)),
})

export const serverMaterialImagesSchema = z.object({
  slug: z.string(),
  imageKey: z.string(),
  variants: z.array(variantSchema),
})

export const serverSiteImagesSchema = z.object({
  kind: z.enum(SITE_IMAGE_KIND_IDS),
  folder: z.string(),
  index: z.number().int().nullable(),
  basename: z.string(),
  variants: z.array(variantSchema),
})

/** Resultado común para la interfaz: grupos de variantes (principal, galería 1…, o una sola). */
export interface ImageGenerationResult {
  /** Clave lógica en el repositorio de imágenes (p. ej. products/vela-lavanda) o carpeta del sitio. */
  imageKey: string
  groups: { label: string; variants: ImageVariant[] }[]
}

// ---------- Detección por contenido (misma lista que detectImageMimeFromBuffer del Server) ----------

/** Devuelve el tipo real por los primeros bytes, o null si no es una imagen permitida (SVG nunca). */
export function detectImageType(bytes: Uint8Array): string | null {
  const b = bytes
  if (b.length < 12) return null
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return 'image/jpeg'
  if (b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) return 'image/png'
  if (b[0] === 0x47 && b[1] === 0x49 && b[2] === 0x46) return 'image/gif'
  if ((b[0] === 0x49 && b[1] === 0x49 && b[2] === 0x2a && b[3] === 0x00) || (b[0] === 0x4d && b[1] === 0x4d && b[2] === 0x00 && b[3] === 0x2a)) {
    return 'image/tiff'
  }
  if (b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46 && b[8] === 0x57 && b[9] === 0x45 && b[10] === 0x42 && b[11] === 0x50) {
    return 'image/webp'
  }
  // ISO BMFF: ....ftypavif / ftypavis
  if (b[4] === 0x66 && b[5] === 0x74 && b[6] === 0x79 && b[7] === 0x70) {
    const brand = String.fromCharCode(b[8]!, b[9]!, b[10]!, b[11]!)
    if (brand === 'avif' || brand === 'avis' || brand.includes('av1')) return 'image/avif'
  }
  return null
}
