import { z } from 'zod'
import { safeLinkHref } from './links'

/**
 * Configuración de la tienda. Fuente en el Server:
 * - Rutas: `/admin/store-{shipping,currency,customer,payment}-settings` (todas con admin.access)
 * - Tipos: common/config/shipping-config.ts, common/config/currency-config.ts,
 *   store/infrastructure/store-settings.repository.ts, payments/domain/payment-method.ts
 *
 * IMPORTANTE: para envíos, moneda y atención al cliente el Server NO valida el cuerpo (lo guarda tal
 * cual con $set). Estos esquemas son la única validación: son estrictos (rechazan campos extra) y
 * acotan tipos y longitudes.
 */

const text = (max: number) => z.string().trim().max(max, `Máximo ${max} caracteres.`)
const money = z.number({ invalid_type_error: 'Ingresa un número.' }).int('Usa un valor entero.').min(0, 'No puede ser negativo.').max(1_000_000_000, 'Valor demasiado alto.')

// ---------- Envíos ----------

export const THRESHOLD_APPLICATIONS = ['subtotal', 'total_before_taxes', 'total_final'] as const

export const SHIPPING_MESSAGE_KEYS = [
  'remainingMessage',
  'freeShippingMessage',
  'shippingCostMessage',
  'variableShippingMessage',
  'progressBarMessage',
  'progressBarCompleteMessage',
] as const

export const shippingSettingsSchema = z
  .object({
    shippingEnabled: z.boolean(),
    freeShippingEnabled: z.boolean(),
    freeShippingThreshold: money,
    flatRateEnabled: z.boolean(),
    flatRate: money,
    applyThresholdOn: z.enum(THRESHOLD_APPLICATIONS),
    showProgressBar: z.boolean(),
    showMessages: z.boolean(),
    messages: z
      .object({
        remainingMessage: text(300),
        freeShippingMessage: text(300),
        shippingCostMessage: text(300),
        variableShippingMessage: text(300),
        progressBarMessage: text(300),
        progressBarCompleteMessage: text(300),
      })
      .strict(),
  })
  .strict()
export type ShippingSettings = z.infer<typeof shippingSettingsSchema>

/** Lectura tolerante: el Server mezcla con sus valores por defecto. */
export const serverShippingResponseSchema = z.object({
  data: shippingSettingsSchema.extend({ calculationType: z.string().optional() }).passthrough(),
})

// ---------- Moneda (formato de presentación) ----------

export const currencySettingsSchema = z
  .object({
    name: text(60).min(1, 'Ingresa el nombre.'),
    symbol: text(5).min(1, 'Ingresa el símbolo.'),
    prefix: text(10),
    suffix: text(10),
    decimalPlaces: z.number().int().min(0, 'Mínimo 0.').max(4, 'Máximo 4.'),
    decimalSeparator: z.enum([',', '.']),
    thousandsSeparator: z.enum(['.', ',', ' ', '']),
    spaceBetween: z.boolean(),
    symbolPosition: z.enum(['before', 'after']),
    showCode: z.boolean(),
  })
  .strict()
  .refine((v) => v.decimalSeparator !== v.thousandsSeparator, {
    path: ['thousandsSeparator'],
    message: 'Debe ser distinto del separador decimal.',
  })
export type CurrencySettings = z.infer<typeof currencySettingsSchema>

export const serverCurrencyResponseSchema = z.object({
  data: z.object({ code: z.string() }).passthrough(),
})

export interface CurrencySettingsView extends CurrencySettings {
  /** Solo lectura: cambiarlo no convierte los precios almacenados. */
  code: string
}

// ---------- Atención al cliente ----------

export const faqItemSchema = z
  .object({
    id: z.string().regex(/^[a-z0-9-]{1,40}$/, 'Identificador inválido.'),
    question: text(300).min(1, 'Escribe la pregunta.'),
    answer: text(2000).min(1, 'Escribe la respuesta.'),
  })
  .strict()

export const customerSettingsSchema = z
  .object({
    supportWhatsappPhone: z
      .string()
      .trim()
      .refine((v) => v === '' || /^\d{8,15}$/.test(v), 'Solo dígitos con indicativo de país, sin + (ej. 573001234567).'),
    contactEmail: z.string().trim().max(254).refine((v) => v === '' || z.string().email().safeParse(v).success, 'Correo inválido.'),
    faqItems: z.array(faqItemSchema).max(30, 'Máximo 30 preguntas.'),
    policiesContent: text(20000),
    policiesUrl: z.union([safeLinkHref, z.literal('')]),
    termsContent: text(20000),
    termsUrl: z.union([safeLinkHref, z.literal('')]),
    promotionTooltipDelayMs: z
      .number({ invalid_type_error: 'Indica un número en milisegundos.' })
      .int('Usa un número entero de milisegundos.')
      .min(0, 'Mínimo 0 ms.')
      .max(5000, 'Máximo 5000 ms (5 s).'),
  })
  .strict()
export type CustomerSettings = z.infer<typeof customerSettingsSchema>

export const serverCustomerResponseSchema = z.object({
  settings: z
    .object({
      supportWhatsappPhone: z.string().catch(''),
      contactEmail: z.string().catch(''),
      faqItems: z.array(z.object({ id: z.string(), question: z.string(), answer: z.string() })).catch([]),
      policiesContent: z.string().catch(''),
      policiesUrl: z.string().catch(''),
      termsContent: z.string().catch(''),
      termsUrl: z.string().catch(''),
      promotionTooltipDelayMs: z.number().int().min(0).max(5000).catch(1000),
    })
    .passthrough(),
})

// ---------- Métodos de pago ----------

export const PAYMENT_METHOD_IDS = ['mercadopago', 'manual', 'cash', 'bank_transfer'] as const
export type PaymentMethodId = (typeof PAYMENT_METHOD_IDS)[number]

/** Mercado Pago no se activa ni desactiva desde Lumia Admin (ver docs/modules.md). */
export const LOCKED_PAYMENT_METHODS: readonly PaymentMethodId[] = ['mercadopago']

const bankDetailsSchema = z
  .object({
    bankName: text(120).min(1, 'Ingresa el banco.'),
    accountNumber: text(80).min(1, 'Ingresa el número de cuenta.'),
    accountHolder: text(160).min(1, 'Ingresa el titular.'),
    taxId: text(40),
    instructions: text(500),
  })
  .strict()

export const paymentSettingsSchema = z
  .object({
    methods: z
      .array(
        z
          .object({
            methodId: z.enum(PAYMENT_METHOD_IDS),
            isActive: z.boolean(),
            displayName: text(80).min(1, 'Ingresa el nombre visible.'),
            description: text(300),
            estimatedProcessingTime: text(60),
          })
          .strict(),
      )
      .min(1)
      .max(PAYMENT_METHOD_IDS.length)
      .refine((m) => new Set(m.map((x) => x.methodId)).size === m.length, 'Métodos repetidos.'),
    bankTransferDetails: bankDetailsSchema.nullable(),
  })
  .strict()
  .superRefine((v, ctx) => {
    const bank = v.methods.find((m) => m.methodId === 'bank_transfer')
    if (bank?.isActive && !v.bankTransferDetails) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['bankTransferDetails'], message: 'Con transferencia activa, completa los datos bancarios.' })
    }
  })
export type PaymentSettings = z.infer<typeof paymentSettingsSchema>

export const serverPaymentResponseSchema = z.object({
  methods: z.array(
    z.object({
      methodId: z.string(),
      isActive: z.boolean(),
      displayName: z.string().catch(''),
      description: z.string().catch(''),
      estimatedProcessingTime: z.string().catch(''),
    }),
  ),
  bankTransferDetails: z
    .object({
      bankName: z.string().catch(''),
      accountNumber: z.string().catch(''),
      accountHolder: z.string().catch(''),
      taxId: z.string().optional().catch(undefined),
      instructions: z.string().optional().catch(undefined),
    })
    .nullable()
    .catch(null),
  updatedAt: z.string().nullable().catch(null),
})

export interface PaymentSettingsView extends PaymentSettings {
  updatedAt: string | null
}
