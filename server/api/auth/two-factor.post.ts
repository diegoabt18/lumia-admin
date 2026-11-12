import { twoFactorInputSchema } from '#shared/schemas/auth'
import type { LoginResult } from '#shared/types/auth'
import {
  clearTwoFactorChallenge,
  readServerTokens,
  readTwoFactorChallenge,
  storeServerTokens,
} from '../../utils/admin-session'
import { loadAdminSession } from '../../utils/session-profile'
import { assertOk, rawServerCall, throwBffError, toBffError, UpstreamError } from '../../utils/upstream'
import { readValidatedJson } from '../../utils/validation'

/** Completa el login con 2FA: POST /api/auth/2fa/verify del Server con el tempToken guardado. */
export default defineEventHandler(async (event): Promise<LoginResult> => {
  const input = await readValidatedJson(event, twoFactorInputSchema)
  const tempToken = readTwoFactorChallenge(event)
  if (!tempToken) {
    throwBffError(401, {
      code: 'TWO_FACTOR_EXPIRED',
      message: 'La verificación expiró. Inicia sesión de nuevo.',
    })
  }

  try {
    const res = await rawServerCall(event, '/api/auth/2fa/verify', {
      method: 'POST',
      body: { tempToken, code: input.code },
    })
    try {
      assertOk(res)
    } catch (error) {
      if (error instanceof UpstreamError && (error.statusCode === 400 || error.statusCode === 401)) {
        throwBffError(401, {
          code: 'INVALID_TWO_FACTOR_CODE',
          message: 'El código no es válido o ya expiró.',
          fieldErrors: { code: ['El código no es válido o ya expiró.'] },
          requestId: error.requestId,
        })
      }
      throw error
    }

    clearTwoFactorChallenge(event)
    const tokens = readServerTokens(res.setCookies)
    if (!tokens.access?.value || !tokens.refresh?.value) {
      throw new UpstreamError(502, 'UPSTREAM_INVALID_RESPONSE', 'El servidor no emitió la sesión esperada.', res.requestId)
    }
    storeServerTokens(event, tokens)

    const session = await loadAdminSession(event)
    return { status: 'authenticated', session }
  } catch (error) {
    toBffError(error)
  }
})
