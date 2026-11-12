import { hasPermission, type PermissionId } from '#shared/auth/permissions'
import type { LoginInput, TwoFactorInput } from '#shared/schemas/auth'
import type { AdminSession, LoginResult } from '#shared/types/auth'

type AuthStatus = 'unknown' | 'authenticated' | 'anonymous'

/** Motivo por el que se volvió al login (se muestra en la pantalla de acceso). */
export type SignedOutReason = 'expired' | 'no_admin_access' | 'signed_out' | null

/**
 * Estado de sesión del admin (Nuxt useState, convención del ecosistema para auth).
 * La app corre solo en el navegador (ssr: false), así que no hay estado compartido entre
 * peticiones de servidor. Los tokens nunca llegan aquí: viven en cookies HttpOnly del BFF.
 */
export function useAuth() {
  const session = useState<AdminSession | null>('admin-session', () => null)
  const status = useState<AuthStatus>('admin-session-status', () => 'unknown')
  const signedOutReason = useState<SignedOutReason>('admin-signed-out-reason', () => null)
  const loading = useState<Promise<void> | null>('admin-session-loading', () => null)

  const user = computed(() => session.value?.user ?? null)
  const isAuthenticated = computed(() => status.value === 'authenticated' && session.value !== null)

  function setSession(next: AdminSession) {
    session.value = next
    status.value = 'authenticated'
    signedOutReason.value = null
  }

  function clearSession(reason: SignedOutReason) {
    session.value = null
    status.value = 'anonymous'
    signedOutReason.value = reason
  }

  /** Carga la sesión una sola vez (deduplicado). */
  async function ensureLoaded(options: { force?: boolean } = {}): Promise<void> {
    if (status.value !== 'unknown' && !options.force) return
    if (loading.value) return loading.value

    loading.value = (async () => {
      try {
        setSession(await $fetch<AdminSession>('/api/session'))
      } catch (error) {
        const ui = toUiError(error)
        if (ui.code === 'NO_ADMIN_ACCESS') clearSession('no_admin_access')
        else if (ui.status === 401) clearSession(ui.code === 'SESSION_EXPIRED' ? 'expired' : null)
        else {
          // Error de red o del Server: no se asume sesión válida.
          clearSession(null)
          throw error
        }
      } finally {
        loading.value = null
      }
    })()
    return loading.value
  }

  async function login(input: LoginInput): Promise<LoginResult> {
    const result = await $fetch<LoginResult>('/api/auth/login', { method: 'POST', body: input })
    if (result.status === 'authenticated') setSession(result.session)
    return result
  }

  async function verifyTwoFactor(input: TwoFactorInput): Promise<LoginResult> {
    const result = await $fetch<LoginResult>('/api/auth/two-factor', { method: 'POST', body: input })
    if (result.status === 'authenticated') setSession(result.session)
    return result
  }

  async function logout(): Promise<void> {
    try {
      await $fetch('/api/auth/logout', { method: 'POST' })
    } finally {
      clearSession('signed_out')
      await navigateTo('/login')
    }
  }

  /** Llamado cuando el BFF responde 401 de sesión en cualquier petición. */
  async function handleSessionLost(): Promise<void> {
    clearSession('expired')
    const route = useRoute()
    await navigateTo({ path: '/login', query: route.path !== '/login' ? { redirect: route.fullPath } : {} })
  }

  /** Solo para ocultar opciones: el Server vuelve a autorizar cada petición. */
  function can(permission: PermissionId): boolean {
    return hasPermission(session.value?.permissions ?? [], permission)
  }

  function canAny(permissions: readonly PermissionId[]): boolean {
    return permissions.some((p) => can(p))
  }

  return {
    session: readonly(session),
    status: readonly(status),
    signedOutReason: readonly(signedOutReason),
    user,
    isAuthenticated,
    ensureLoaded,
    login,
    verifyTwoFactor,
    logout,
    handleSessionLost,
    can,
    canAny,
  }
}
