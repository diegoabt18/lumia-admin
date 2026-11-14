import { DEFAULT_LUMI_TIMEZONE, type LumiTaskRow } from '#shared/schemas/lumi-automation'
import { INITIATIVE_STATE_LABELS, type InitiativeState } from '#shared/schemas/lumi-initiatives'

/** "08:00" → "8:00 a. m.", "14:00" → "2:00 p. m." (mismo formato que los mensajes de Lumi). */
export function formatClock(time: string): string {
  const [h = 0, m = 0] = time.split(':').map(Number)
  const suffix = h < 12 ? 'a. m.' : 'p. m.'
  return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${suffix}`
}

/** Fecha y hora en la zona indicada (por defecto, la de la tienda). Sin dato o inválida: guion. */
export function formatDateTime(iso: string | null | undefined, timeZone: string = DEFAULT_LUMI_TIMEZONE): string {
  if (!iso) return '—'
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return '—'
  return new Intl.DateTimeFormat('es-CO', {
    timeZone,
    day: 'numeric',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit',
  }).format(date)
}

export const TASK_KIND_LABELS: Record<string, string> = {
  reminder: 'Recordatorio diario',
  initiative_review: 'Revisión de iniciativas',
  routine: 'Rutina',
  follow_up: 'Segundo aviso',
}

export const EXECUTION_STATUS_LABELS: Record<string, { label: string; tone: 'positive' | 'info' | 'warning' | 'danger' | 'neutral' }> = {
  pending: { label: 'Pendiente', tone: 'info' },
  running: { label: 'Enviando', tone: 'info' },
  succeeded: { label: 'Enviado', tone: 'positive' },
  failed: { label: 'Reintentando', tone: 'warning' },
  dead: { label: 'Fallido', tone: 'danger' },
  skipped: { label: 'Omitido', tone: 'neutral' },
}

/** Texto del horario de una tarea. Los segundos avisos se describen aparte. */
export function scheduleLabel(task: Pick<LumiTaskRow, 'schedule'>): string {
  if (task.schedule.type === 'once') return `Una vez: ${formatDateTime(task.schedule.runAt, DEFAULT_LUMI_TIMEZONE)}`
  return `Todos los días a las ${formatClock(task.schedule.time)}`
}

export const INITIATIVE_PRIORITY: Record<1 | 2 | 3, { label: string; tone: 'neutral' | 'warning' | 'danger' }> = {
  1: { label: 'Informativa', tone: 'neutral' },
  2: { label: 'Conviene revisar', tone: 'warning' },
  3: { label: 'Urgente', tone: 'danger' },
}

export function initiativeStateLabel(state: InitiativeState): string {
  return INITIATIVE_STATE_LABELS[state]
}
