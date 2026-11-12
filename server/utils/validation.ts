import type { H3Event } from 'h3'
import type { z } from 'zod'
import { throwBffError } from './upstream'

/** Lee y valida el cuerpo JSON con Zod; responde 422 con errores por campo. */
export async function readValidatedJson<T extends z.ZodTypeAny>(event: H3Event, schema: T): Promise<z.infer<T>> {
  let body: unknown
  try {
    body = await readBody(event)
  } catch {
    throwBffError(400, { code: 'INVALID_INPUT', message: 'El cuerpo de la solicitud no es JSON válido.' })
  }
  const parsed = schema.safeParse(body ?? {})
  if (!parsed.success) {
    const fieldErrors = parsed.error.flatten().fieldErrors as Record<string, string[] | undefined>
    throwBffError(422, {
      code: 'INVALID_INPUT',
      message: 'Revisa los campos marcados.',
      fieldErrors: Object.fromEntries(
        Object.entries(fieldErrors).filter((entry): entry is [string, string[]] => Array.isArray(entry[1])),
      ),
    })
  }
  return parsed.data
}
