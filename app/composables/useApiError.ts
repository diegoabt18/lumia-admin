import type { BffErrorData } from '#shared/types/auth'

export interface UiError {
  status: number
  code: string
  message: string
  fieldErrors: Record<string, string[]>
  requestId?: string
}

const FALLBACK_MESSAGE = 'No se pudo completar la operación. Intenta de nuevo.'

/** Normaliza un error de $fetch (FetchError con data BffErrorData) a un formato de interfaz. */
export function toUiError(error: unknown): UiError {
  const e = error as { statusCode?: number; status?: number; data?: unknown; message?: string }
  const status = e?.statusCode ?? e?.status ?? 0
  const raw = e?.data as Partial<BffErrorData> & { data?: Partial<BffErrorData> } | undefined
  // h3 envuelve `data` dentro de la respuesta de error.
  const data: Partial<BffErrorData> | undefined = raw?.data && typeof raw.data === 'object' ? raw.data : raw

  if (!status) {
    return { status: 0, code: 'NETWORK_ERROR', message: 'Sin conexión con Lumia Admin. Revisa tu red.', fieldErrors: {} }
  }

  return {
    status,
    code: typeof data?.code === 'string' ? data.code : `HTTP_${status}`,
    message: typeof data?.message === 'string' && data.message ? data.message : FALLBACK_MESSAGE,
    fieldErrors: data?.fieldErrors && typeof data.fieldErrors === 'object' ? data.fieldErrors : {},
    requestId: typeof data?.requestId === 'string' ? data.requestId : undefined,
  }
}

export function isSessionError(error: UiError): boolean {
  return error.status === 401 && (error.code === 'SESSION_REQUIRED' || error.code === 'SESSION_EXPIRED')
}
