import { z } from 'zod'
import type { AdminPaginationMeta } from '../contracts/api'
import type { OrderItemContract } from '../contracts/sales'
import { isoDate, paginationSchema } from './common'

/**
 * Pedidos. Fuente en el Server:
 * - Rutas: `/admin/orders*` (orders.read / orders.update) en server/src/routes/admin.routes.ts
 * - Entrada: adminOrderPatchSchema, adminCancellationResolveSchema
 * - Salida: AdminOrderService.list / get (serializeOrderListItem y detalle)
 * - Enumeraciones: server/src/modules/sales/domain/order.entity.ts
 */

export const ORDER_STATUSES = ['pending', 'paid', 'shipped', 'delivered', 'cancelled', 'expired'] as const
export type OrderStatus = (typeof ORDER_STATUSES)[number]

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  pending: 'Pendiente',
  paid: 'Pagado',
  shipped: 'Enviado',
  delivered: 'Entregado',
  cancelled: 'Cancelado',
  expired: 'Expirado',
}

export const PAYMENT_STATUS_LABELS: Record<string, string> = {
  unpaid: 'Sin pagar',
  pending: 'Pendiente',
  in_process: 'En proceso',
  pending_manual: 'Pago manual pendiente',
  paid: 'Pagado',
  refunded: 'Reembolsado',
  failed: 'Fallido',
  expired: 'Expirado',
  deposit_pending: 'Anticipo pendiente',
  deposit_paid: 'Anticipo pagado',
  final_payment_pending: 'Saldo pendiente',
  payment_completed: 'Pago completo',
  partially_paid: 'Pago parcial',
}

export const CHANNEL_LABELS: Record<'online' | 'pos', string> = { online: 'Tienda online', pos: 'POS' }

export const CANCELLATION_STATUS_LABELS: Record<string, string> = {
  requested: 'Solicitada',
  approved: 'Aprobada',
  rejected: 'Rechazada',
  info_needed: 'Información requerida',
}

const DEPOSIT_PAYMENT_STATES = new Set(['deposit_pending', 'deposit_paid', 'final_payment_pending'])

/**
 * Transiciones de estado que ofrece la interfaz.
 *
 * El Server (OrderRepository.adminPatch) acepta CUALQUIER cambio de estado sin validar el flujo,
 * y cada cambio tiene efectos: `paid` descuenta stock, `cancelled` lo repone y `delivered`
 * registra el evento contable (ingreso al entregar). Esta tabla es una protección de la interfaz
 * hasta que el Server valide las transiciones (ver docs/modules.md).
 */
export function allowedTransitions(order: { status: OrderStatus; paymentStatus: string | null }): OrderStatus[] {
  const depositFlow = order.paymentStatus !== null && DEPOSIT_PAYMENT_STATES.has(order.paymentStatus)
  switch (order.status) {
    case 'pending':
      // "Pagado" lo decide el libro de pagos cuando el saldo queda cubierto; nunca un cambio manual.
      return ['cancelled']
    case 'paid':
      return ['shipped', 'delivered', 'cancelled']
    case 'shipped':
      return ['delivered']
    default:
      return []
  }
}

// ---------- Cuerpos aceptados por el BFF ----------

export const orderStatusBodySchema = z
  .object({
    status: z.enum(['paid', 'shipped', 'delivered', 'cancelled']),
    cancellationReason: z.string().trim().max(1000).optional(),
  })
  .strict()
export type OrderStatusBody = z.infer<typeof orderStatusBodySchema>

export const orderNotesBodySchema = z.object({ notes: z.string().max(2000, 'Máximo 2000 caracteres.') }).strict()

export const cancellationResolveBodySchema = z
  .object({
    resolution: z.enum(['approved', 'rejected', 'info_needed']),
    adminNote: z.string().trim().max(1000, 'Máximo 1000 caracteres.').optional(),
  })
  .strict()
export type CancellationResolveBody = z.infer<typeof cancellationResolveBodySchema>

// ---------- Respuestas del Server ----------

const statusSchema = z.enum(ORDER_STATUSES)
const nullableString = z.string().nullable().optional().catch(null)

const serverOrderItemSchema = z.object({
  productId: z.string().catch(''),
  productSlug: z.string().optional().catch(undefined),
  variantSku: z.string().optional().catch(undefined),
  variantName: z.string().optional().catch(undefined),
  selectionLabel: z.string().optional().catch(undefined),
  name: z.string().catch('Producto'),
  quantity: z.number(),
  unitPrice: z.number(),
  subtotal: z.number(),
  taxRate: z.number().nullable().optional().catch(null),
})

const serverOrderListItemSchema = z.object({
  id: z.string(),
  orderNumber: nullableString,
  customerReference: nullableString,
  userEmail: nullableString,
  userName: nullableString,
  phone: nullableString,
  items: z.array(z.unknown()).catch([]),
  total: z.number(),
  status: statusSchema,
  paymentStatus: nullableString,
  paymentMethod: nullableString,
  channel: z.enum(['online', 'pos']).catch('online'),
  createdAt: isoDate,
  cancellationRequestStatus: nullableString,
})

export const serverOrderListSchema = z.object({
  orders: z.array(serverOrderListItemSchema),
  pagination: paginationSchema,
})

const serverOrderEventSchema = z.object({
  type: z.string(),
  timestamp: z.string(),
  source: z.string().catch('system'),
})

export const serverOrderDetailSchema = z.object({
  order: z.object({
    id: z.string(),
    orderNumber: nullableString,
    customerReference: nullableString,
    status: statusSchema,
    paymentStatus: nullableString,
    paymentMethod: nullableString,
    channel: z.enum(['online', 'pos']).catch('online'),
    fulfillment: z.enum(['delivery', 'in_store']).catch('delivery'),
    receiptNumber: nullableString,
    currency: z.string().catch('COP'),
    total: z.number(),
    subtotal: z.number().catch(0),
    shippingCost: z.number().catch(0),
    discountAmount: z.number().catch(0),
    tax: z.number().catch(0),
    customerName: nullableString,
    phone: nullableString,
    email: nullableString,
    notes: nullableString,
    address: nullableString,
    city: nullableString,
    reference: nullableString,
    createdAt: isoDate,
    updatedAt: isoDate,
    cancellationReason: nullableString,
    cancelledAt: isoDate,
    cancellationRequestStatus: nullableString,
    cancellationRequestReason: nullableString,
    cancellationRequestedAt: isoDate,
    items: z.array(serverOrderItemSchema),
    events: z.array(serverOrderEventSchema).catch([]),
    depositPercentage: z.number().nullable().catch(null),
    depositAmount: z.number().nullable().catch(null),
    depositPaidAt: isoDate,
    finalPaymentAmount: z.number().nullable().catch(null),
    finalPaymentPaidAt: isoDate,
    paidAt: isoDate,
    deliveredAt: isoDate,
  }),
})

// ---------- Modelo hacia el navegador ----------

export interface OrderRow {
  id: string
  orderNumber: string | null
  /** Referencia corta que ve el cliente (ORD-XXXXXXXX). */
  customerReference: string | null
  customer: string | null
  contact: string | null
  itemCount: number
  total: number
  status: OrderStatus
  paymentStatus: string | null
  channel: 'online' | 'pos'
  createdAt: string | null
  cancellationRequestStatus: string | null
}

export interface OrderList {
  items: OrderRow[]
  pagination: AdminPaginationMeta
}

export type OrderItem = Pick<OrderItemContract, 'name' | 'quantity' | 'unitPrice' | 'subtotal'> & {
  variantSku: string | null
  variantLabel: string | null
  taxRate: number | null
}

export interface OrderEventView {
  type: string
  timestamp: string
  source: string
}

export interface OrderDetail {
  id: string
  orderNumber: string | null
  customerReference: string | null
  status: OrderStatus
  paymentStatus: string | null
  paymentMethod: string | null
  channel: 'online' | 'pos'
  fulfillment: 'delivery' | 'in_store'
  receiptNumber: string | null
  currency: string
  totals: { subtotal: number; shippingCost: number; discountAmount: number; tax: number; total: number }
  customer: { name: string | null; phone: string | null; email: string | null }
  shipping: { address: string | null; city: string | null; reference: string | null }
  notes: string | null
  createdAt: string | null
  updatedAt: string | null
  paidAt: string | null
  deliveredAt: string | null
  cancellation: {
    reason: string | null
    cancelledAt: string | null
    requestStatus: string | null
    requestReason: string | null
    requestedAt: string | null
  }
  deposit: {
    percentage: number | null
    amount: number | null
    paidAt: string | null
    finalAmount: number | null
    finalPaidAt: string | null
    /** Siguiente paso permitido del plan de anticipo (ver depositStep). */
    step: DepositStep
  }
  items: OrderItem[]
  events: OrderEventView[]
}

// ---------- Anticipos ----------

/**
 * Paso del plan de anticipo que la interfaz puede ejecutar.
 *
 * El Server (AdminOrderService.configureDeposit / markDepositPaid / markFinalPaymentPaid) no
 * comprueba el estado del pedido: permitiría configurar un anticipo en un pedido cancelado o
 * entregado. El BFF solo actúa sobre pedidos `pending` y en el orden configurar → anticipo → saldo.
 * Al registrar el saldo el Server marca el pedido como pagado y descuenta stock.
 */
export type DepositStep = 'configure' | 'pay_deposit' | 'pay_final' | 'none'

export function depositStep(order: { status: OrderStatus; paymentStatus: string | null }): DepositStep {
  if (order.status !== 'pending') return 'none'
  switch (order.paymentStatus) {
    case 'deposit_pending':
      return 'pay_deposit'
    case 'final_payment_pending':
      return 'pay_final'
    case 'paid':
    case 'payment_completed':
    case 'deposit_paid':
    case 'refunded':
    // Pago en línea en curso (p. ej. Mercado Pago): no se mezcla con un plan de anticipo.
    case 'in_process':
      return 'none'
    default:
      return 'configure'
  }
}

export const depositConfigureBodySchema = z
  .object({ percentage: z.number().int('Usa un porcentaje entero.').min(1, 'Mínimo 1%.').max(99, 'Máximo 99%.') })
  .strict()

export const paymentRecordBodySchema = z
  .object({
    amount: z.number().positive('El monto debe ser mayor que 0.').max(9_999_999_999),
    note: z.string().trim().max(500, 'Máximo 500 caracteres.').optional(),
  })
  .strict()
export type PaymentRecordBody = z.infer<typeof paymentRecordBodySchema>

export const ORDER_EVENT_LABELS: Record<string, string> = {
  'deposit.created': 'Plan de anticipo configurado',
  'deposit.paid': 'Anticipo pagado',
  'final_payment.paid': 'Saldo pagado',
  'order.created': 'Pedido creado',
  'order.updated': 'Pedido actualizado',
  'order.shipped': 'Pedido enviado',
  'order.delivered': 'Pedido entregado',
  'order.cancelled': 'Pedido cancelado',
  'payment.manual_confirmed': 'Pago confirmado manualmente',
  'cancellation.approved': 'Cancelación aprobada',
  'cancellation.rejected': 'Cancelación rechazada',
  'cancellation.info_requested': 'Se pidió información sobre la cancelación',
}

/* ─── Pagos y saldos (G3). Fuente: Server GET/POST /admin/orders/:id/payments ─── */

export const ORDER_PAYMENT_METHOD_LABELS: Record<'cash' | 'bank_transfer', string> = {
  cash: 'Efectivo',
  bank_transfer: 'Transferencia',
}

/** Registro de un pago en mostrador. El importe se valida contra el saldo en el Server. */
export const orderPaymentRegisterBodySchema = z
  .object({
    method: z.enum(['cash', 'bank_transfer'], { required_error: 'Elige un método de pago.' }),
    amount: z.number({ invalid_type_error: 'Ingresa un importe.' }).positive('El importe debe ser mayor que 0.').max(9_999_999_999),
    receivedAmount: z.number().nonnegative().max(9_999_999_999).nullable().optional(),
    transferReference: z.string().trim().min(1, 'La transferencia requiere la referencia.').max(120).nullable().optional(),
    note: z.string().trim().max(500, 'Máximo 500 caracteres.').optional(),
    idempotencyKey: z.string().trim().min(1).max(100).optional(),
  })
  .strict()
export type OrderPaymentRegisterBody = z.infer<typeof orderPaymentRegisterBodySchema>

export const serverOrderPaymentSummarySchema = z.object({
  orderId: z.string(),
  total: z.number(),
  initialPaymentRequired: z.number(),
  paidAmount: z.number(),
  balanceDue: z.number(),
  /** Importe exacto que debe registrarse a continuación: el anticipo pendiente, luego el saldo completo. */
  nextPaymentRequired: z.number(),
  initialRemaining: z.number().catch(0),
  paymentStatus: z.string(),
  status: z.string(),
  lines: z.array(
    z.object({
      index: z.number(),
      name: z.string(),
      variantSku: z.string().nullable(),
      fulfillmentMode: z.enum(['stock', 'made_to_order']).catch('stock'),
      lineTotal: z.number(),
      initialPaymentRequired: z.number(),
      paidAmount: z.number(),
      balanceDue: z.number(),
    }),
  ),
  payments: z.array(
    z.object({
      id: z.string().optional(),
      method: z.string(),
      amount: z.number(),
      status: z.string(),
      paidAt: z.string().nullable(),
      reference: z.string().nullable(),
      receivedAmount: z.number().nullable(),
      changeGiven: z.number().nullable(),
    }),
  ),
})
export type OrderPaymentSummary = z.infer<typeof serverOrderPaymentSummarySchema>
