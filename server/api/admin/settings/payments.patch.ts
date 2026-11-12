import { LOCKED_PAYMENT_METHODS, paymentSettingsSchema } from '#shared/schemas/settings'
import { serverApi } from '../../../utils/server-api'
import { fetchPaymentView, toPaymentView } from '../../../utils/settings'
import { toBffError } from '../../../utils/upstream'
import { readValidatedJson } from '../../../utils/validation'

/**
 * PATCH /api/admin/store-payment-settings (Server: admin.access + adminPaymentMethodsSchema).
 *
 * - Los métodos bloqueados (Mercado Pago) conservan su estado y textos actuales: su activación no
 *   se gestiona desde Lumia Admin. El BFF ignora lo que el navegador envíe para ellos.
 * - Se envía siempre la lista completa (el Server reemplaza `methods`), para no perder textos.
 */
export default defineEventHandler(async (event) => {
  const input = await readValidatedJson(event, paymentSettingsSchema)
  try {
    const current = await fetchPaymentView(event)
    const methods = current.methods.map((existing) => {
      if (LOCKED_PAYMENT_METHODS.includes(existing.methodId)) return existing
      return input.methods.find((m) => m.methodId === existing.methodId) ?? existing
    })
    const body = {
      methods: methods.map((m) => ({
        methodId: m.methodId,
        isActive: m.isActive,
        displayName: m.displayName,
        ...(m.description ? { description: m.description } : {}),
        ...(m.estimatedProcessingTime ? { estimatedProcessingTime: m.estimatedProcessingTime } : {}),
      })),
      bankTransferDetails: input.bankTransferDetails
        ? {
            bankName: input.bankTransferDetails.bankName,
            accountNumber: input.bankTransferDetails.accountNumber,
            accountHolder: input.bankTransferDetails.accountHolder,
            ...(input.bankTransferDetails.taxId ? { taxId: input.bankTransferDetails.taxId } : {}),
            ...(input.bankTransferDetails.instructions ? { instructions: input.bankTransferDetails.instructions } : {}),
          }
        : null,
    }
    return toPaymentView(await serverApi(event, '/api/admin/store-payment-settings', { method: 'PATCH', body }))
  } catch (error) {
    toBffError(error)
  }
})
