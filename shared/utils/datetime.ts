/**
 * Conversión entre fechas ISO (UTC) y el valor de <input type="datetime-local"> interpretado en la
 * zona horaria de la tienda (NUXT_PUBLIC_STORE_TIMEZONE, p. ej. America/Bogota).
 * Así las vigencias se editan en hora de la tienda sin importar la zona del navegador.
 */

const LOCAL_PATTERN = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/

/** Diferencia (ms) entre la hora de pared en `timeZone` y UTC para un instante dado. */
function zoneOffsetMs(instant: number, timeZone: string): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).formatToParts(new Date(instant))
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value ?? '0')
  const asUtc = Date.UTC(get('year'), get('month') - 1, get('day'), get('hour'), get('minute'), get('second'))
  return asUtc - Math.floor(instant / 1000) * 1000
}

/** "2026-11-07T10:30" (hora de la tienda) → ISO UTC. Devuelve null si el valor no es válido. */
export function zonedLocalToIso(local: string, timeZone: string): string | null {
  const m = LOCAL_PATTERN.exec(local)
  if (!m) return null
  const guess = Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]), Number(m[4]), Number(m[5]))
  const first = guess - zoneOffsetMs(guess, timeZone)
  // Segunda pasada por si el desplazamiento cambia en ese instante (horario de verano).
  const result = guess - zoneOffsetMs(first, timeZone)
  const date = new Date(result)
  return Number.isNaN(date.getTime()) ? null : date.toISOString()
}

/** ISO UTC → "YYYY-MM-DDTHH:mm" en la zona de la tienda (para datetime-local). */
export function isoToZonedLocal(iso: string, timeZone: string): string {
  const instant = Date.parse(iso)
  if (Number.isNaN(instant)) return ''
  const local = new Date(instant + zoneOffsetMs(instant, timeZone))
  return local.toISOString().slice(0, 16)
}
