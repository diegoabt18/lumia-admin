import type { ZodError } from 'zod'

/** Errores de Zod indexados por ruta con puntos (ej. "messages.remainingMessage", "faqItems.0.question"). */
export function zodFieldErrors(error: ZodError): Record<string, string> {
  const out: Record<string, string> = {}
  for (const issue of error.issues) {
    const key = issue.path.join('.') || '_form'
    if (!out[key]) out[key] = issue.message
  }
  return out
}

/** Errores por campo que devuelve el BFF (primer mensaje de cada campo). */
export function bffFieldErrors(fieldErrors: Record<string, string[]>): Record<string, string> {
  return Object.fromEntries(Object.entries(fieldErrors).map(([k, v]) => [k, v[0] ?? '']))
}
