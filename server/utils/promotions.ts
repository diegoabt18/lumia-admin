import type { PromotionBody, PromotionDetail, PromotionRow, ServerPromotion } from '#shared/schemas/promotions'

export function toPromotionRow(p: ServerPromotion): PromotionRow {
  const individual = p.productEntries.filter((e) => e.percentOff !== null).length
  const discountSummary = p.applyGeneralDiscount && p.generalPercentOff !== null
    ? `${p.generalPercentOff}% general${individual ? ` · ${individual} con % propio` : ''}`
    : `% por producto (${p.productEntries.length})`
  const parts: string[] = []
  if (p.categorySlugs.length) parts.push(`${p.categorySlugs.length} categoría(s)`)
  if (p.productEntries.length) parts.push(`${p.productEntries.length} producto(s)`)
  return {
    id: p.id,
    name: p.name,
    lifecycle: p.lifecycle,
    active: p.active,
    startsAt: p.startsAt,
    endsAt: p.endsAt,
    priority: p.priority,
    discountSummary,
    scopeSummary: parts.join(' · ') || '—',
  }
}

export function toPromotionDetail(p: ServerPromotion): PromotionDetail {
  return {
    id: p.id,
    name: p.name,
    description: p.description,
    bannerUrl: p.bannerUrl ?? '',
    color: p.color ?? '',
    active: p.active,
    startsAt: p.startsAt,
    endsAt: p.endsAt,
    priority: p.priority,
    applyGeneralDiscount: p.applyGeneralDiscount,
    generalPercentOff: p.generalPercentOff,
    categorySlugs: p.categorySlugs,
    productEntries: p.productEntries,
    lifecycle: p.lifecycle,
    updatedAt: p.updatedAt,
  }
}

/**
 * Cuerpo snake_case para el Server (promotionUpsertSchema).
 * `preserve` conserva campos que la interfaz no edita, porque el Server reemplaza el documento.
 */
export function toServerPromotionBody(input: PromotionBody, preserve?: Pick<ServerPromotion, 'notificationImageSlug' | 'notificationImagePath'>) {
  return {
    name: input.name,
    description: input.description || null,
    banner_url: input.bannerUrl || null,
    color: input.color || null,
    active: input.active,
    starts_at: input.startsAt,
    ends_at: input.endsAt,
    priority: input.priority,
    apply_general_discount: input.applyGeneralDiscount,
    general_percent_off: input.applyGeneralDiscount ? input.generalPercentOff : null,
    category_slugs: input.applyGeneralDiscount ? input.categorySlugs : [],
    product_entries: input.productEntries.map((e) => ({ product_slug: e.productSlug, percent_off: e.percentOff })),
    notification_image_slug: preserve?.notificationImageSlug ?? null,
    notification_image_path: preserve?.notificationImagePath ?? null,
  }
}
