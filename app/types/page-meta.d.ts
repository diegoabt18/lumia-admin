import type { PermissionId } from '#shared/auth/permissions'
import type { Crumb } from './ui'

declare module '#app' {
  interface PageMeta {
    /** Página accesible sin sesión (login). */
    public?: boolean
    /** Permisos de los que basta uno para entrar. Solo presentación: el Server decide. */
    permissions?: readonly PermissionId[]
    /** Título visible en el encabezado y en la pestaña. */
    title?: string
    breadcrumbs?: Crumb[]
  }
}

export {}
