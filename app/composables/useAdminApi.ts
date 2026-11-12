export interface AdminRequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
  /** JSON, o FormData solo para la subida de imágenes (el BFF acepta multipart únicamente ahí). */
  body?: Record<string, unknown> | FormData
  query?: Record<string, string | number | boolean | undefined>
  headers?: Record<string, string>
}

/** $fetch sin la inferencia de rutas tipadas de Nitro (provoca recursión de tipos con URLs dinámicas). */
const fetchJson = $fetch as unknown as <T>(url: string, options?: AdminRequestOptions) => Promise<T>

/**
 * Cliente del navegador hacia el BFF (/api/*). Nunca llama al Server directamente.
 * Si el BFF responde 401 de sesión, limpia el estado y redirige al login.
 */
export function useAdminApi() {
  const auth = useAuth()

  async function request<T>(url: `/api/${string}`, options: AdminRequestOptions = {}): Promise<T> {
    try {
      return await fetchJson<T>(url, options)
    } catch (error) {
      if (isSessionError(toUiError(error))) await auth.handleSessionLost()
      throw error
    }
  }

  return { request }
}
