/** Solo rutas internas: evita redirecciones abiertas desde ?redirect=. */
export function safeRedirect(value: unknown): string {
  const raw = Array.isArray(value) ? value[0] : value
  if (
    typeof raw !== 'string' ||
    !raw.startsWith('/') ||
    raw.startsWith('//') ||
    raw.includes('\\') ||
    raw.startsWith('/login') ||
    raw.startsWith('/api/')
  ) {
    return '/dashboard'
  }
  return raw
}
