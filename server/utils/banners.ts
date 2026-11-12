import { BANNER_POSITION_LABELS, type BannerBody, type BannerPosition, type BannerRow, type ServerBanner } from '#shared/schemas/banners'

function isHttps(value: string): boolean {
  try {
    return new URL(value).protocol === 'https:'
  } catch {
    return false
  }
}

export function toBannerRow(b: ServerBanner, now = Date.now()): BannerRow {
  const starts = Date.parse(b.startsAt)
  const ends = Date.parse(b.endsAt)
  const timing: BannerRow['timing'] = ends < now ? 'expired' : starts > now ? 'scheduled' : 'live'
  return {
    id: b.id,
    position: b.position,
    positionLabel: BANNER_POSITION_LABELS[b.position as BannerPosition] ?? b.position,
    active: b.active,
    timing,
    priority: b.priority,
    startsAt: b.startsAt,
    endsAt: b.endsAt,
    // Solo se previsualizan imágenes https en el admin (datos históricos podrían traer otra cosa).
    imageUrl: isHttps(b.imageUrl) ? b.imageUrl : null,
    title: b.title,
    subtitle: b.subtitle,
    ctaLabel: b.ctaLabel,
    ctaHref: b.ctaHref,
    promotionId: b.promotionId,
    categorySlug: b.categorySlug,
    collectionSlug: b.collectionSlug,
  }
}

/** Cuerpo snake_case para el Server; conserva `collection_slug` porque el Server reemplaza el documento. */
export function toServerBannerBody(input: BannerBody, preserve?: Pick<ServerBanner, 'collectionSlug'>) {
  return {
    position: input.position,
    image_url: input.imageUrl,
    title: input.title || null,
    subtitle: input.subtitle || null,
    cta_label: input.ctaLabel || null,
    cta_href: input.ctaHref || null,
    promotion_id: input.promotionId || null,
    category_slug: input.categorySlug || null,
    collection_slug: preserve?.collectionSlug ?? null,
    active: input.active,
    priority: input.priority,
    starts_at: input.startsAt,
    ends_at: input.endsAt,
  }
}
