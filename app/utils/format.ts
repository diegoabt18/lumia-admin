/** Formateadores con la moneda/locale/zona horaria configurados (mismos valores que Lumia 2.0). */

export function formatCurrency(value: number): string {
  const { storeCurrency, storeLocale } = useRuntimeConfig().public
  return new Intl.NumberFormat(storeLocale, {
    style: 'currency',
    currency: storeCurrency,
    maximumFractionDigits: 0,
  }).format(value)
}

/** Costo unitario: hasta 2 decimales (p. ej. $12,50 por gramo), sin redondear a pesos enteros. */
export function formatUnitCost(value: number): string {
  const { storeCurrency, storeLocale } = useRuntimeConfig().public
  return new Intl.NumberFormat(storeLocale, {
    style: 'currency',
    currency: storeCurrency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(value)
}

export function formatNumber(value: number): string {
  return new Intl.NumberFormat(useRuntimeConfig().public.storeLocale).format(value)
}

export function formatDateTime(iso: string): string {
  const { storeLocale, storeTimezone } = useRuntimeConfig().public
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return '—'
  return new Intl.DateTimeFormat(storeLocale, {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: storeTimezone,
  }).format(date)
}
