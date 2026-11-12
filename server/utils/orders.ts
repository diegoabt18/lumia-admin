import type { H3Event } from 'h3'
import type { z } from 'zod'
import { depositStep, serverOrderDetailSchema, type OrderDetail } from '#shared/schemas/orders'
import { parseUpstream } from './request-input'
import { serverApi } from './server-api'

type ServerOrderDetail = z.infer<typeof serverOrderDetailSchema>['order']

export async function fetchOrderDetail(event: H3Event, id: string): Promise<ServerOrderDetail> {
  const data = parseUpstream(serverOrderDetailSchema, await serverApi(event, `/api/admin/orders/${id}`), 'GET /admin/orders/:id')
  return data.order
}

export function toOrderDetail(o: ServerOrderDetail): OrderDetail {
  return {
    id: o.id,
    orderNumber: o.orderNumber ?? null,
    customerReference: o.customerReference ?? null,
    status: o.status,
    paymentStatus: o.paymentStatus ?? null,
    paymentMethod: o.paymentMethod ?? null,
    channel: o.channel,
    fulfillment: o.fulfillment,
    receiptNumber: o.receiptNumber ?? null,
    currency: o.currency,
    totals: {
      subtotal: o.subtotal,
      shippingCost: o.shippingCost,
      discountAmount: o.discountAmount,
      tax: o.tax,
      total: o.total,
    },
    customer: { name: o.customerName ?? null, phone: o.phone ?? null, email: o.email ?? null },
    shipping: { address: o.address ?? null, city: o.city ?? null, reference: o.reference ?? null },
    notes: o.notes ?? null,
    createdAt: o.createdAt ?? null,
    updatedAt: o.updatedAt ?? null,
    paidAt: o.paidAt ?? null,
    deliveredAt: o.deliveredAt ?? null,
    cancellation: {
      reason: o.cancellationReason ?? null,
      cancelledAt: o.cancelledAt ?? null,
      requestStatus: o.cancellationRequestStatus ?? null,
      requestReason: o.cancellationRequestReason ?? null,
      requestedAt: o.cancellationRequestedAt ?? null,
    },
    deposit: {
      percentage: o.depositPercentage,
      amount: o.depositAmount,
      paidAt: o.depositPaidAt ?? null,
      finalAmount: o.finalPaymentAmount,
      finalPaidAt: o.finalPaymentPaidAt ?? null,
      step: depositStep({ status: o.status, paymentStatus: o.paymentStatus ?? null }),
    },
    items: o.items.map((i) => ({
      name: i.name,
      quantity: i.quantity,
      unitPrice: i.unitPrice,
      subtotal: i.subtotal,
      variantSku: i.variantSku ?? null,
      variantLabel: i.selectionLabel ?? i.variantName ?? null,
      taxRate: i.taxRate ?? null,
    })),
    events: [...o.events].sort((a, b) => a.timestamp.localeCompare(b.timestamp)),
  }
}
