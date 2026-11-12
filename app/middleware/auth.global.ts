/**
 * Guardia de rutas (navegador). Oculta pantallas a quien no tiene sesión o permiso;
 * no sustituye la autorización del Server, que valida cada petición en el BFF.
 */
export default defineNuxtRouteMiddleware(async (to) => {
  const auth = useAuth()

  try {
    await auth.ensureLoaded()
  } catch {
    // Server o BFF no disponibles: el login muestra el estado; no se asume sesión.
  }

  if (to.meta.public) {
    if (to.path === '/login' && auth.isAuthenticated.value) {
      return navigateTo(safeRedirect(to.query.redirect))
    }
    return
  }

  if (!auth.isAuthenticated.value) {
    return navigateTo({ path: '/login', query: to.fullPath !== '/' ? { redirect: to.fullPath } : {} })
  }

  const required = to.meta.permissions
  if (required?.length && !auth.canAny(required)) {
    return abortNavigation(
      createError({ statusCode: 403, statusMessage: 'No tienes permiso para ver esta sección.' }),
    )
  }
})
