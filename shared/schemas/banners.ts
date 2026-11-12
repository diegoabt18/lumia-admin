import { z } from 'zod'
import { OBJECT_ID_PATTERN, SLUG_PATTERN } from './common'
import { httpsImageUrl, safeLinkHref } from './links'

/**
 * Banners de la tienda. Fuente en el Server:
 * - Rutas: `/admin/store-banners*` (lectura products.read, escritura products.update)
 * - Entrada: storeBannerUpsertSchema. Posiciones: STORE_BANNER_POSITIONS (store-banner.entity.ts)
 * - Salida: StoreBannerRepository.adminSerialize
 * - PATCH reemplaza el documento: el BFF conserva `collection_slug`, que la interfaz no edita.
 * - Destino del enlace en la tienda (resolveStoreBannerHref): cta_href > promoción > categoría > colección > /products
 */

export const BANNER_POSITIONS = [
  'homepage_hero',
  'homepage_secondary',
  'catalog_top',
  'catalog_middle',
  'seasonal',
  'featured',
] as const
export type BannerPosition = (typeof BANNER_POSITIONS)[number]

export const BANNER_POSITION_LABELS: Record<BannerPosition, string> = {
  homepage_hero: 'Inicio · principal',
  homepage_secondary: 'Inicio · secundario',
  catalog_top: 'Catálogo · superior',
  catalog_middle: 'Catálogo · intermedio',
  seasonal: 'Temporada',
  featured: 'Destacado',
}

const optionalText = (max: number) => z.string().trim().max(max, `Máximo ${max} caracteres.`)

export const bannerBodySchema = z
  .object({
    position: z.enum(BANNER_POSITIONS, { errorMap: () => ({ message: 'Elige una posición.' }) }),
    imageUrl: httpsImageUrl,
    title: optionalText(300),
    subtitle: optionalText(800),
    ctaLabel: optionalText(120),
    ctaHref: z.union([safeLinkHref, z.literal('')]),
    promotionId: z.union([z.string().regex(OBJECT_ID_PATTERN), z.literal('')]),
    categorySlug: z.union([z.string().regex(SLUG_PATTERN), z.literal('')]),
    active: z.boolean(),
    priority: z.number().int().min(0).max(999_999),
    startsAt: z.string().datetime({ message: 'Fecha de inicio inválida.' }),
    endsAt: z.string().datetime({ message: 'Fecha de fin inválida.' }),
  })
  .strict()
  .superRefine((v, ctx) => {
    if (Date.parse(v.endsAt) <= Date.parse(v.startsAt)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['endsAt'], message: 'La fecha de fin debe ser posterior al inicio.' })
    }
  })
export type BannerBody = z.infer<typeof bannerBodySchema>

const serverBannerSchema = z.object({
  id: z.string(),
  active: z.boolean(),
  position: z.string(),
  priority: z.number().catch(100),
  startsAt: z.string(),
  endsAt: z.string(),
  imageUrl: z.string(),
  title: z.string().nullable().catch(null),
  subtitle: z.string().nullable().catch(null),
  ctaLabel: z.string().nullable().catch(null),
  ctaHref: z.string().nullable().catch(null),
  promotionId: z.string().nullable().catch(null),
  categorySlug: z.string().nullable().catch(null),
  collectionSlug: z.string().nullable().catch(null),
  updatedAt: z.string().nullable().catch(null),
})
export type ServerBanner = z.infer<typeof serverBannerSchema>

export const serverBannerListSchema = z.object({ banners: z.array(serverBannerSchema) })
export const serverBannerDetailSchema = z.object({ banner: serverBannerSchema })

export interface BannerRow {
  id: string
  position: string
  positionLabel: string
  active: boolean
  /** programado | vigente | vencido (calculado con la hora actual del BFF). */
  timing: 'scheduled' | 'live' | 'expired'
  priority: number
  startsAt: string
  endsAt: string
  imageUrl: string | null
  title: string | null
  subtitle: string | null
  ctaLabel: string | null
  ctaHref: string | null
  promotionId: string | null
  categorySlug: string | null
  collectionSlug: string | null
}
