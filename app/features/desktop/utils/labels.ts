import { PERMISSIONS, type PermissionId } from '#shared/auth/permissions'
import type { DesktopDevice, DesktopExecution, DesktopExecutionStatus } from '#shared/schemas/desktop'

/**
 * Textos de la sección Dispositivos. Las operaciones y sus permisos reflejan el catálogo del
 * Server (src/modules/lumi/desktop-agent/domain/operations.ts); el Server vuelve a comprobarlo todo.
 */

type Tone = 'neutral' | 'gold' | 'positive' | 'warning' | 'danger' | 'info'

const OS_LABEL: Record<string, string> = { windows: 'Windows', macos: 'macOS', linux: 'Linux' }

export function osLabel(device: Pick<DesktopDevice, 'os' | 'osVersion' | 'arch'>): string {
  return [OS_LABEL[device.os] ?? device.os, device.osVersion, device.arch].filter(Boolean).join(' · ')
}

/** Estado visible del equipo, en orden de prioridad. */
export function deviceState(device: DesktopDevice): { label: string; tone: Tone } {
  if (device.status === 'revoked') return { label: 'Revocado', tone: 'danger' }
  if (!device.online) return { label: 'Desconectado', tone: 'neutral' }
  if (device.execution === 'paused') return { label: 'En pausa', tone: 'warning' }
  return { label: 'Conectado', tone: 'positive' }
}

/** Motivo legible de un motor no disponible (`reason` del agente). */
export function engineReason(reason: string | null): string {
  if (!reason) return 'No disponible'
  // Motivos que envía el agente (crates/engine-browser y engine-desktop, EngineStatusReport).
  const known: Record<string, string> = {
    engine_binary_missing: 'Falta el motor en la instalación',
    no_supported_browser: 'No se encontró Chrome ni Edge',
    accessibility_permission_missing: 'Falta el permiso de accesibilidad',
    platform_unavailable: 'No disponible en este sistema',
    engine_error: 'El motor falló al iniciarse',
    internal: 'Error interno del agente',
  }
  return known[reason] ?? 'No disponible'
}

const OPERATION_LABEL: Record<string, string> = {
  'browser.discover': 'Detectar navegadores',
  'browser.snapshot': 'Leer la página',
  'browser.tabs.list': 'Listar pestañas',
  'browser.navigate': 'Abrir página',
  'browser.click': 'Pulsar en la página',
  'browser.fill': 'Escribir en la página',
  'browser.scroll': 'Desplazar la página',
  'browser.close_session': 'Cerrar el navegador',
  'desktop.status': 'Estado de accesibilidad',
  'desktop.list_applications': 'Listar aplicaciones',
  'desktop.list_windows': 'Listar ventanas',
  'desktop.snapshot': 'Leer la aplicación',
  'desktop.get_value': 'Leer un campo',
  'desktop.click': 'Pulsar en la aplicación',
  'desktop.set_value': 'Escribir en la aplicación',
  'desktop.press_key': 'Pulsar una tecla',
  'files.roots': 'Ver carpetas autorizadas',
  'files.list': 'Ver una carpeta',
  'files.download': 'Descargar un archivo',
  'files.upload': 'Enviar un archivo',
}

export function operationLabel(operation: string): string {
  return OPERATION_LABEL[operation] ?? operation
}

/** Resumen del registro (sin datos privados: el Server guarda la longitud del texto, no el texto). */
export function argsLabel(execution: Pick<DesktopExecution, 'argsSummary'>): string {
  const a = execution.argsSummary
  const parts: string[] = []
  if (typeof a.origin === 'string') parts.push(a.origin)
  if (typeof a.app === 'string') parts.push(a.app)
  if (typeof a.key === 'string') parts.push(`tecla ${a.key}`)
  if (typeof a.value_length === 'number') parts.push(`${a.value_length} caracteres`)
  if (typeof a.direction === 'string') parts.push(a.direction === 'up' ? 'arriba' : 'abajo')
  // Archivos: solo la extensión y el tamaño (el Server no guarda nombres ni rutas).
  if (typeof a.ext === 'string') parts.push(`.${a.ext}`)
  if (typeof a.size === 'number') parts.push(formatSize(a.size))
  return parts.join(' · ')
}

const STATUS: Record<DesktopExecutionStatus, { label: string; tone: Tone }> = {
  dispatched: { label: 'Enviada', tone: 'info' },
  received: { label: 'Recibida', tone: 'info' },
  validated: { label: 'Validada', tone: 'info' },
  running: { label: 'En curso', tone: 'info' },
  verifying: { label: 'Verificando', tone: 'info' },
  completed: { label: 'Completada', tone: 'positive' },
  unverified: { label: 'Sin verificar', tone: 'warning' },
  failed: { label: 'Falló', tone: 'danger' },
  rejected: { label: 'Rechazada', tone: 'danger' },
  cancelled: { label: 'Cancelada', tone: 'neutral' },
  timed_out: { label: 'Sin respuesta', tone: 'warning' },
}

export function executionStatus(status: DesktopExecutionStatus): { label: string; tone: Tone } {
  return STATUS[status]
}

const APPROVAL_KIND: Record<string, string> = {
  open_page: 'Abrir páginas',
  click_page: 'Pulsar en páginas',
  type_page: 'Escribir en páginas',
  click_app: 'Pulsar en la aplicación',
  type_app: 'Escribir en la aplicación',
}

export function approvalKindLabel(kind: string): string {
  return APPROVAL_KIND[kind] ?? kind
}

function formatSize(n: number): string {
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${Math.round(n / 1024)} KB`
  return `${(n / (1024 * 1024)).toFixed(1)} MB`
}

/** Permiso que el Server exige para cancelar (el de la operación). */
export function operationPermission(operation: string): PermissionId | null {
  if (operation === 'files.upload') return PERMISSIONS.DESKTOP_FILES_WRITE
  if (operation.startsWith('files.')) return PERMISSIONS.DESKTOP_FILES_READ
  const control = new Set(['browser.navigate', 'browser.click', 'browser.fill', 'browser.scroll', 'browser.close_session'])
  if (operation.startsWith('browser.')) return control.has(operation) ? PERMISSIONS.DESKTOP_BROWSER_CONTROL : PERMISSIONS.DESKTOP_BROWSER_READ
  if (operation.startsWith('desktop.')) {
    return ['desktop.click', 'desktop.set_value', 'desktop.press_key'].includes(operation)
      ? PERMISSIONS.DESKTOP_APPS_CONTROL
      : PERMISSIONS.DESKTOP_APPS_READ
  }
  return null
}

export function formatDuration(ms: number | null): string {
  if (ms === null) return '—'
  if (ms < 1000) return `${ms} ms`
  return `${(ms / 1000).toFixed(ms < 10_000 ? 1 : 0)} s`
}
