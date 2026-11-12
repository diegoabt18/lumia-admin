import type { H3Event } from 'h3'

/**
 * Sesión propia de Lumia Admin (patrón BFF "token handler").
 *
 * El Server emite `lumia_access` / `lumia_refresh` con el Domain/Secure/SameSite de su entorno
 * (en producción: Domain=.lumiadalistore.com; Secure; SameSite=None). Lumia Admin NO reenvía
 * esas cookies al navegador. En su lugar:
 *
 *   1. Lee los tokens de los Set-Cookie del Server en el BFF.
 *   2. Los guarda en cookies PROPIAS: nombre distinto, host-only (sin Domain),
 *      HttpOnly, SameSite=Strict, Path=/api.
 *   3. En cada llamada al Server, reconstruye el header Cookie con los nombres del Server.
 *
 * Consecuencias:
 *   - La sesión del admin es independiente de la de Lumia 2.0 (otro origen, otros nombres,
 *     otra sesión en la colección `sessions` del Server). Cerrar sesión en una app no cierra la otra.
 *   - Funciona igual contra un Server de desarrollo o de producción: no depende del Domain
 *     ni del Secure que el Server ponga en sus cookies.
 *   - El navegador nunca ve los tokens.
 */

export const ADMIN_ACCESS_COOKIE = 'lumia_admin_at'
export const ADMIN_REFRESH_COOKIE = 'lumia_admin_rt'
export const ADMIN_TWO_FACTOR_COOKIE = 'lumia_admin_2fa'

const COOKIE_PATH = '/api'
/** Margen para que la cookie de acceso caduque antes que el JWT del Server. */
const ACCESS_SKEW_SECONDS = 15
const TWO_FACTOR_MAX_AGE_SECONDS = 5 * 60

export interface ParsedServerToken {
  value: string
  /** Segundos de vida según Max-Age/Expires; 0 = el Server la está borrando. */
  maxAge: number
}

export interface ServerTokens {
  access?: ParsedServerToken
  refresh?: ParsedServerToken
}

export interface SessionTokens {
  accessToken?: string
  refreshToken?: string
}

function cookieOptions(maxAge: number) {
  const config = useRuntimeConfig()
  return {
    httpOnly: true,
    secure: config.sessionCookieSecure !== false,
    sameSite: 'strict' as const,
    path: COOKIE_PATH,
    maxAge,
  }
}

/** Parsea un header Set-Cookie: nombre, valor y vida útil. */
function parseSetCookie(header: string): { name: string; token: ParsedServerToken } | null {
  const [pair, ...attributes] = header.split(';')
  if (!pair) return null
  const eq = pair.indexOf('=')
  if (eq <= 0) return null
  const name = pair.slice(0, eq).trim()
  let value = pair.slice(eq + 1).trim()
  try {
    value = decodeURIComponent(value)
  } catch {
    /* valor sin codificar */
  }

  let maxAge: number | null = null
  let expires: number | null = null
  for (const attribute of attributes) {
    const [rawKey, ...rest] = attribute.split('=')
    const key = rawKey?.trim().toLowerCase()
    const attrValue = rest.join('=').trim()
    if (key === 'max-age') {
      const n = Number.parseInt(attrValue, 10)
      if (Number.isFinite(n)) maxAge = n
    } else if (key === 'expires') {
      const t = Date.parse(attrValue)
      if (Number.isFinite(t)) expires = t
    }
  }

  let lifetime = maxAge ?? (expires !== null ? Math.floor((expires - Date.now()) / 1000) : 0)
  if (!value) lifetime = 0
  return { name, token: { value, maxAge: Math.max(0, lifetime) } }
}

/** Extrae los tokens del Server de sus Set-Cookie. */
export function readServerTokens(setCookies: string[]): ServerTokens {
  const config = useRuntimeConfig()
  const tokens: ServerTokens = {}
  for (const header of setCookies) {
    const parsed = parseSetCookie(header)
    if (!parsed) continue
    if (parsed.name === config.serverAccessCookieName) tokens.access = parsed.token
    else if (parsed.name === config.serverRefreshCookieName) tokens.refresh = parsed.token
  }
  return tokens
}

/**
 * Tokens vigentes para esta petición. Si el BFF renovó la sesión durante la petición,
 * prevalecen los tokens nuevos (guardados en event.context).
 */
export function readSessionTokens(event: H3Event): SessionTokens {
  const renewed = event.context.adminSession as SessionTokens | undefined
  if (renewed) return renewed
  return {
    accessToken: getCookie(event, ADMIN_ACCESS_COOKIE) || undefined,
    refreshToken: getCookie(event, ADMIN_REFRESH_COOKIE) || undefined,
  }
}

/** Persiste en cookies propias los tokens recibidos del Server. */
export function storeServerTokens(event: H3Event, tokens: ServerTokens): SessionTokens {
  const current = readSessionTokens(event)
  const next: SessionTokens = { ...current }

  if (tokens.access) {
    if (tokens.access.maxAge > 0) {
      const maxAge = Math.max(1, tokens.access.maxAge - ACCESS_SKEW_SECONDS)
      setCookie(event, ADMIN_ACCESS_COOKIE, tokens.access.value, cookieOptions(maxAge))
      next.accessToken = tokens.access.value
    } else {
      deleteCookie(event, ADMIN_ACCESS_COOKIE, cookieOptions(0))
      next.accessToken = undefined
    }
  }
  if (tokens.refresh) {
    if (tokens.refresh.maxAge > 0) {
      setCookie(event, ADMIN_REFRESH_COOKIE, tokens.refresh.value, cookieOptions(tokens.refresh.maxAge))
      next.refreshToken = tokens.refresh.value
    } else {
      deleteCookie(event, ADMIN_REFRESH_COOKIE, cookieOptions(0))
      next.refreshToken = undefined
    }
  }

  event.context.adminSession = next
  return next
}

export function clearAdminSession(event: H3Event): void {
  deleteCookie(event, ADMIN_ACCESS_COOKIE, cookieOptions(0))
  deleteCookie(event, ADMIN_REFRESH_COOKIE, cookieOptions(0))
  deleteCookie(event, ADMIN_TWO_FACTOR_COOKIE, cookieOptions(0))
  event.context.adminSession = {}
}

/** El tempToken del 2FA queda en una cookie HttpOnly de vida corta, no en el navegador. */
export function storeTwoFactorChallenge(event: H3Event, tempToken: string): void {
  setCookie(event, ADMIN_TWO_FACTOR_COOKIE, tempToken, cookieOptions(TWO_FACTOR_MAX_AGE_SECONDS))
}

export function readTwoFactorChallenge(event: H3Event): string | undefined {
  return getCookie(event, ADMIN_TWO_FACTOR_COOKIE) || undefined
}

export function clearTwoFactorChallenge(event: H3Event): void {
  deleteCookie(event, ADMIN_TWO_FACTOR_COOKIE, cookieOptions(0))
}
