import { throwBffError } from '../utils/upstream'

/**
 * Cualquier /api/* no declarado explícitamente responde 404 JSON.
 * No existe un proxy universal: cada endpoint del Server que use el admin se expone con
 * su propio handler (ver docs/bff.md). Sin este handler, Nuxt devolvería el HTML de la SPA.
 */
export default defineEventHandler(() => {
  throwBffError(404, { code: 'NOT_FOUND', message: 'Recurso no disponible.' })
})
