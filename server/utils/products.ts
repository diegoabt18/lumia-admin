import type { z } from 'zod'
import { variantLabel, type ProductDetail, type ProductRow, type serverProductDetailSchema, type serverProductListSchema } from '#shared/schemas/products'

type ServerProduct = z.infer<typeof serverProductListSchema>['products'][number]
type ServerDetail = z.infer<typeof serverProductDetailSchema>

/** Proyección de producto del Server al modelo del admin. */
export function toProductRow(p: ServerProduct): ProductRow {
  return {
    id: p.id,
    name: p.name,
    slug: p.slug,
    categorySlug: p.categorySlug,
    brand: p.brand,
    status: p.status,
    taxRate: p.taxRate,
    updatedAt: p.updatedAt ?? p.createdAt ?? null,
  }
}

export function toProductDetail(data: ServerDetail): ProductDetail {
  return {
    ...toProductRow(data.product),
    description: data.product.description,
    createdAt: data.product.createdAt ?? null,
    optionAxes: data.optionAxes?.length
      ? data.optionAxes.map((a) => ({
          id: a.id,
          name: a.name,
          position: a.position,
          values: a.values.map((v) => ({
            id: v.id,
            optionId: v.optionId,
            value: v.value,
            slug: v.slug,
            position: v.position,
          }))
        }))
      : data.options.map((o) => ({ name: o.name, values: o.values })),
    variants: data.variants.map((v) => ({
      sku: v.sku,
      label: variantLabel(v.options),
      options: v.options,
      barcode: v.barcode,
      price: v.price,
      compareAtPrice: v.compareAtPrice,
      currency: v.currency,
      stock: v.stock,
      reserved: v.reserved,
      available: v.available,
      isPerOrder: v.inventory.some((i) => i.is_per_order === true),
    })),
  }
}
