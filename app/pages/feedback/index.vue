<template>
  <div>
    <PageHeader
      eyebrow="Tienda"
      title="Reseñas y preguntas"
      description="Reportes enviados por los clientes sobre reseñas, preguntas y respuestas de productos."
    />

    <div
      class="mb-5 rounded-xl border border-status-info/20 bg-status-info-soft/50 px-4 py-3 text-[13px] leading-relaxed text-status-info"
      role="note"
    >
      <p class="font-medium">Lo que permite el servidor hoy</p>
      <ul class="mt-1 list-disc space-y-0.5 pl-5">
        <li>El reporte no incluye el texto ni el producto del elemento: no se puede previsualizar desde el panel.</li>
        <li>Ocultar retira el elemento de la tienda y se puede revertir con "Mostrar". Las respuestas no se pueden moderar.</li>
        <li>Los reportes no se marcan como resueltos: siguen en la lista después de actuar.</li>
      </ul>
    </div>

    <BaseCard :padded="false">
      <div class="space-y-4 p-4 sm:p-5">
        <DataTable
          :columns="columns"
          :rows="rows"
          :row-key="(row) => row.id"
          :loading="loading"
          :error="errorMessage"
          caption="Reportes de reseñas y preguntas"
          empty-title="No hay reportes"
          empty-description="Cuando un cliente reporte una reseña, pregunta o respuesta aparecerá aquí."
          @retry="refresh"
        >
          <template #cell-createdAt="{ row }">
            <span class="whitespace-nowrap tabular-nums text-lumia-ink/70">
              {{ row.createdAt ? formatDateTime(row.createdAt) : '—' }}
            </span>
          </template>
          <template #cell-entityType="{ row }">
            <div class="flex flex-wrap items-center gap-1.5">
              <BaseBadge :tone="row.entityType === 'review' ? 'gold' : row.entityType === 'unknown' ? 'warning' : 'neutral'">
                {{ FEEDBACK_ENTITY_LABELS[row.entityType] }}
              </BaseBadge>
              <BaseBadge v-if="outcomeFor(row) === 'hidden'" tone="danger">Ocultado</BaseBadge>
              <BaseBadge v-else-if="outcomeFor(row) === 'visible'" tone="positive">Visible</BaseBadge>
            </div>
          </template>
          <template #cell-reason="{ row }">
            <p class="line-clamp-3 max-w-md whitespace-pre-line break-words text-lumia-ink">{{ row.reason || '—' }}</p>
          </template>
          <template #cell-entityId="{ row }">
            <code class="break-all rounded bg-lumia-cream/70 px-1.5 py-0.5 text-[12px] text-lumia-ink/70">{{ row.entityId || '—' }}</code>
          </template>
          <template #cell-reporterId="{ row }">
            <code class="break-all text-[12px] text-lumia-ink/60">{{ row.reporterId || '—' }}</code>
          </template>
          <template #actions="{ row }">
            <template v-if="row.moderatable">
              <BaseButton
                variant="ghost"
                size="sm"
                :disabled="busyKey !== null"
                :loading="busyKey === actionKey(row, true)"
                @click="setHidden(row, true)"
              >
                <template #icon>
                  <IconEyeOff class="h-4 w-4 text-status-danger" stroke-width="1.75" aria-hidden="true" />
                </template>
                Ocultar
              </BaseButton>
              <BaseButton
                variant="ghost"
                size="sm"
                :disabled="busyKey !== null"
                :loading="busyKey === actionKey(row, false)"
                @click="setHidden(row, false)"
              >
                <template #icon>
                  <IconEye class="h-4 w-4" stroke-width="1.75" aria-hidden="true" />
                </template>
                Mostrar
              </BaseButton>
            </template>
            <span v-else class="text-[12px] text-lumia-ink/50">
              {{ row.entityType === 'answer' ? 'Sin moderación en el servidor' : 'Identificador no válido' }}
            </span>
          </template>
        </DataTable>
        <AppPagination
          v-if="pagination"
          :pagination="pagination"
          :limit-options="[20, 50, 100]"
          item-label="reportes"
          :disabled="loading"
          @update:page="table.setPage"
          @update:limit="table.setLimit"
        />
      </div>
    </BaseCard>
  </div>
</template>

<script setup lang="ts">
import { IconEye, IconEyeOff } from '@tabler/icons-vue'
import { PERMISSIONS } from '#shared/auth/permissions'
import { FEEDBACK_ENTITY_LABELS, type FeedbackReportRow } from '#shared/schemas/feedback'
import type { TableColumn } from '~/types/ui'

definePageMeta({
  layout: 'admin',
  title: 'Reseñas y preguntas',
  permissions: [PERMISSIONS.ADMIN_ACCESS],
  breadcrumbs: [{ label: 'Tienda' }, { label: 'Reseñas y preguntas' }],
})

const { request } = useAdminApi()
const toast = useToast()
const { confirm } = useConfirm()

const table = useTableQuery({ allowedLimits: [20, 50, 100] })
const { rows, pagination, loading, errorMessage, refresh } = useServerList<FeedbackReportRow>(
  'admin-feedback-reports',
  '/api/admin/feedback/reports',
  table,
)

const columns: TableColumn[] = [
  { key: 'createdAt', label: 'Fecha', class: 'w-40' },
  { key: 'entityType', label: 'Tipo', class: 'w-36' },
  { key: 'reason', label: 'Motivo del reporte' },
  { key: 'entityId', label: 'Elemento', class: 'w-56', hideOnMobile: true },
  { key: 'reporterId', label: 'Reportado por', class: 'w-56', hideOnMobile: true },
]

/**
 * Resultado de las acciones hechas en esta sesión del navegador, por elemento.
 * El Server no devuelve si un elemento está oculto, así que solo se muestra lo que se hizo aquí.
 */
const outcomes = ref<Record<string, 'hidden' | 'visible'>>({})
const busyKey = ref<string | null>(null)

const entityKey = (row: FeedbackReportRow) => `${row.entityType}:${row.entityId}`
const actionKey = (row: FeedbackReportRow, hidden: boolean) => `${row.id}:${hidden ? 'hide' : 'show'}`
const outcomeFor = (row: FeedbackReportRow) => outcomes.value[entityKey(row)]

async function setHidden(row: FeedbackReportRow, hidden: boolean) {
  if (!row.moderatable || busyKey.value) return
  const kind = row.entityType === 'review' ? 'reseña' : 'pregunta'
  const ok = await confirm(
    hidden
      ? {
          title: `Ocultar ${kind}`,
          description:
            row.entityType === 'review'
              ? 'Se retirará de la tienda y la calificación del producto se recalculará sin ella. No es posible ver su contenido desde el panel; revisa el motivo del reporte antes de continuar. Puedes revertirlo con "Mostrar".'
              : 'Se retirará de la tienda junto con sus respuestas. No es posible ver su contenido desde el panel; revisa el motivo del reporte antes de continuar. Puedes revertirlo con "Mostrar".',
          confirmLabel: 'Ocultar',
          tone: 'danger',
        }
      : {
          title: `Mostrar ${kind}`,
          description:
            row.entityType === 'review'
              ? 'Volverá a ser visible en la tienda y contará de nuevo en la calificación del producto.'
              : 'Volverá a ser visible en la tienda.',
          confirmLabel: 'Mostrar',
        },
  )
  if (!ok) return

  busyKey.value = actionKey(row, hidden)
  const segment = row.entityType === 'review' ? 'reviews' : 'questions'
  try {
    await request(`/api/admin/feedback/${segment}/${row.entityId}`, { method: 'PATCH', body: { hidden } })
    outcomes.value = { ...outcomes.value, [entityKey(row)]: hidden ? 'hidden' : 'visible' }
    toast.success(hidden ? `La ${kind} se ocultó` : `La ${kind} vuelve a estar visible`)
  } catch (error) {
    const ui = toUiError(error)
    toast.error(`No se pudo actualizar la ${kind}`, ui.message)
  } finally {
    busyKey.value = null
  }
}
</script>
