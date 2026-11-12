import type { H3Event } from 'h3'
import {
  PAYMENT_METHOD_IDS,
  serverCurrencyResponseSchema,
  serverCustomerResponseSchema,
  serverPaymentResponseSchema,
  serverShippingResponseSchema,
  type CurrencySettingsView,
  type CustomerSettings,
  type PaymentMethodId,
  type PaymentSettingsView,
  type ShippingSettings,
} from '#shared/schemas/settings'
import { parseUpstream } from './request-input'
import { serverApi } from './server-api'

/** Proyecciones de solo los campos conocidos (descarta claves extra que el Server pudiera devolver). */

export function toShippingView(data: unknown): ShippingSettings {
  const s = parseUpstream(serverShippingResponseSchema, data, 'store-shipping-settings').data
  return {
    shippingEnabled: s.shippingEnabled,
    freeShippingEnabled: s.freeShippingEnabled,
    freeShippingThreshold: s.freeShippingThreshold,
    flatRateEnabled: s.flatRateEnabled,
    flatRate: s.flatRate,
    applyThresholdOn: s.applyThresholdOn,
    showProgressBar: s.showProgressBar,
    showMessages: s.showMessages,
    messages: { ...s.messages },
  }
}

export function toCurrencyView(data: unknown): CurrencySettingsView {
  const c = parseUpstream(serverCurrencyResponseSchema, data, 'store-currency-settings').data as Record<string, unknown>
  const str = (k: string, fallback = '') => (typeof c[k] === 'string' ? (c[k] as string) : fallback)
  const sep = (k: string, allowed: string[], fallback: string) => (allowed.includes(str(k)) ? str(k) : fallback)
  return {
    code: str('code', 'COP'),
    name: str('name'),
    symbol: str('symbol', '$'),
    prefix: str('prefix'),
    suffix: str('suffix'),
    decimalPlaces: typeof c.decimalPlaces === 'number' ? c.decimalPlaces : 0,
    decimalSeparator: sep('decimalSeparator', [',', '.'], ',') as ',' | '.',
    thousandsSeparator: sep('thousandsSeparator', ['.', ',', ' ', ''], '.') as '.' | ',' | ' ' | '',
    spaceBetween: c.spaceBetween === true,
    symbolPosition: c.symbolPosition === 'after' ? 'after' : 'before',
    showCode: c.showCode === true,
  }
}

export function toCustomerView(data: unknown): CustomerSettings {
  const s = parseUpstream(serverCustomerResponseSchema, data, 'store-customer-settings').settings
  return {
    supportWhatsappPhone: s.supportWhatsappPhone,
    contactEmail: s.contactEmail,
    faqItems: s.faqItems.map((f) => ({ id: f.id, question: f.question, answer: f.answer })),
    policiesContent: s.policiesContent,
    policiesUrl: s.policiesUrl,
    termsContent: s.termsContent,
    termsUrl: s.termsUrl,
    promotionTooltipDelayMs: s.promotionTooltipDelayMs,
  }
}

export function toPaymentView(data: unknown): PaymentSettingsView {
  const p = parseUpstream(serverPaymentResponseSchema, data, 'store-payment-settings')
  const known = new Set<string>(PAYMENT_METHOD_IDS)
  return {
    methods: p.methods
      .filter((m) => known.has(m.methodId))
      .map((m) => ({
        methodId: m.methodId as PaymentMethodId,
        isActive: m.isActive,
        displayName: m.displayName,
        description: m.description,
        estimatedProcessingTime: m.estimatedProcessingTime,
      })),
    bankTransferDetails: p.bankTransferDetails
      ? {
          bankName: p.bankTransferDetails.bankName,
          accountNumber: p.bankTransferDetails.accountNumber,
          accountHolder: p.bankTransferDetails.accountHolder,
          taxId: p.bankTransferDetails.taxId ?? '',
          instructions: p.bankTransferDetails.instructions ?? '',
        }
      : null,
    updatedAt: p.updatedAt,
  }
}

export async function fetchPaymentView(event: H3Event): Promise<PaymentSettingsView> {
  return toPaymentView(await serverApi(event, '/api/admin/store-payment-settings'))
}
