import { z } from 'zod'
import { loginInputSchema } from '#shared/schemas/auth'
import type { LoginResult } from '#shared/types/auth'
import { readServerTokens, storeServerTokens, storeTwoFactorChallenge } from '../../utils/admin-session'
import { loadAdminSession, revokeCurrentSession } from '../../utils/session-profile'
import { assertOk, rawServerCall, throwBffError, toBffError, UpstreamError } from '../../utils/upstream'
import { readValidatedJson } from '../../utils/validation'

/** Respuesta de POST /api/auth/login del Server cuando el usuario tiene 2FA. */
const twoFactorChallengeSchema = z.object({ requires2fa: z.literal(true), tempToken: z.string().min(1) })

/** Mensajes de usuario para los rechazos conocidos del Server. */
function loginRejection(error: UpstreamError): never {
  if (error.statusCode === 401) {
    throwBffError(401, { code: 'INVALID_CREDENTIALS', message: 'Correo o contraseña incorrectos.', requestId: error.requestId })
  }
  if (error.statusCode === 403) {
    throwBffError(403, {
      code: 'LOCAL_LOGIN_DISABLED',
      message: 'El acceso con correo y contraseña no está habilitado en el servidor.',
      requestId: error.requestId,
    })
  }
  if (error.statusCode === 429) {
    throwBffError(429, {
      code: 'RATE_LIMITED',
      message: 'Demasiados intentos. Espera un momento antes de volver a intentarlo.',
      requestId: error.requestId,
    })
  }
  throw error
}

export default defineEventHandler(async (event): Promise<LoginResult> => {
  const input = await readValidatedJson(event, loginInputSchema)

  try {
    // Una sesión previa de este navegador se revoca y se reemplaza por la nueva.
    await revokeCurrentSession(event)

    const res = await rawServerCall(event, '/api/auth/login', {
      method: 'POST',
      body: { email: input.email, password: input.password, rememberMe: input.rememberMe },
    })
    try {
      assertOk(res)
    } catch (error) {
      if (error instanceof UpstreamError) loginRejection(error)
      throw error
    }

    const challenge = twoFactorChallengeSchema.safeParse(res.data)
    if (challenge.success) {
      storeTwoFactorChallenge(event, challenge.data.tempToken)
      return { status: 'two_factor_required' }
    }

    const tokens = readServerTokens(res.setCookies)
    if (!tokens.access?.value || !tokens.refresh?.value) {
      throw new UpstreamError(502, 'UPSTREAM_INVALID_RESPONSE', 'El servidor no emitió la sesión esperada.', res.requestId)
    }
    storeServerTokens(event, tokens)

    // Exige admin.access; si falta, revoca la sesión recién creada y responde 403.
    const session = await loadAdminSession(event)
    return { status: 'authenticated', session }
  } catch (error) {
    toBffError(error)
  }
})
