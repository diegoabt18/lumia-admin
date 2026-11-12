import type { AdminSession } from '#shared/types/auth'
import { loadAdminSession } from '../utils/session-profile'
import { toBffError } from '../utils/upstream'

/** Sesión actual: usuario + permisos efectivos. 401 sin sesión, 403 sin admin.access. */
export default defineEventHandler(async (event): Promise<AdminSession> => {
  try {
    return await loadAdminSession(event)
  } catch (error) {
    toBffError(error)
  }
})
