import { publishBodySchema } from '#shared/schemas/costing'
import { findApproval, loadPricingProduct } from '../../../../../utils/costing'
import { readObjectIdParam } from '../../../../../utils/request-input'
import { serverApi } from '../../../../../utils/server-api'
import { throwBffError, toBffError } from '../../../../../utils/upstream'
import { readValidatedJson } from '../../../../../utils/validation'

/**
 * POST /api/admin/production/approvals/:id/publish (Server: costing.manage).
 * Es el paso que cambia el precio de la tienda. El Server valida base con IVA, precio actual e IVA
 * del producto (PriceApprovalService.assertPublishable); aquí se repiten las comprobaciones como
 * defensa adicional y para dar el mensaje antes de llamar.
 */
export default defineEventHandler(async (event) => {
  const id = readObjectIdParam(event)
  await readValidatedJson(event, publishBodySchema)
  try {
    const approval = await findApproval(event, id, 'approved')
    if (approval.priceBasis !== 'tax_included') {
      throwBffError(409, {
        code: 'LEGACY_PRICE_BASIS',
        message: 'Esta solicitud se creó con la regla anterior (precio sin IVA) y no se puede publicar. Vuelve a enviar el producto a aprobación.',
      })
    }
    const product = await loadPricingProduct(event, approval.productSlug)
    const variant = product.variants.find((v) => v.sku === approval.variantSku)
    if (!variant) {
      throwBffError(409, { code: 'VARIANT_NOT_FOUND', message: 'La variante ya no existe. Rechaza la solicitud.' })
    }
    if (variant.price !== approval.previousPrice) {
      throwBffError(409, {
        code: 'PRICE_CHANGED',
        message: `El precio de la variante cambió (${approval.previousPrice} → ${variant.price}) desde que se creó la solicitud. Recházala y vuelve a enviar el producto a aprobación.`,
      })
    }
    if (!(approval.suggestedPrice > 0)) {
      throwBffError(409, { code: 'INVALID_PRICE', message: 'El precio sugerido no es válido.' })
    }
    if ((product.taxRate ?? null) !== (approval.taxRate ?? null)) {
      throwBffError(409, {
        code: 'TAX_RATE_CHANGED',
        message: `El IVA del producto cambió (${approval.taxRate ?? '—'} % → ${product.taxRate ?? '—'} %) desde que se creó la solicitud. Vuelve a enviar el producto.`,
      })
    }
    await serverApi(event, '/api/admin/production/approvals/publish', { method: 'POST', body: { approvalIds: [id] } })
    return { ok: true as const }
  } catch (error) {
    toBffError(error)
  }
})
