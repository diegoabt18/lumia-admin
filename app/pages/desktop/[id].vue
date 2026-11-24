<template>
  <div class="space-y-8">
    <div v-if="loading && !device" class="space-y-4">
      <BaseSkeleton class="h-10 w-64" />
      <BaseSkeleton class="h-40 w-full" />
    </div>
    <ErrorState v-else-if="errorMessage && !device" :message="errorMessage" @retry="refreshAll" />

    <template v-else-if="device">
      <PageHeader eyebrow="Dispositivo" :title="device.name" :description="osLabel(device)">
        <template v-if="canManage && device.status === 'active'" #actions>
          <BaseButton variant="secondary" @click="renameOpen = true">
            <template #icon><IconPencil class="h-4 w-4" stroke-width="1.75" aria-hidden="true" /></template>
            Renombrar
          </BaseButton>
          <BaseButton variant="danger" :loading="revoking" @click="onRevoke">
            <template #icon><IconPlugConnectedX class="h-4 w-4" stroke-width="1.75" aria-hidden="true" /></template>
            Revocar
          </BaseButton>
        </template>
      </PageHeader>

      <div class="grid gap-4 lg:grid-cols-5">
        <BaseCard class="lg:col-span-2">
          <h2 class="lumia-eyebrow">Estado</h2>
          <div class="mt-3"><BaseBadge :tone="state.tone">{{ state.label }}</BaseBadge></div>
          <dl class="mt-4 space-y-2.5 text-[13px]">
            <div class="flex justify-between gap-4">
              <dt class="shrink-0 text-lumia-ink/55">Agente</dt>
              <dd class="whitespace-nowrap text-right text-lumia-ink">{{ device.agentVersion }}</dd>
            </div>
            <div class="flex justify-between gap-4">
              <dt class="shrink-0 text-lumia-ink/55">Inscrito</dt>
              <dd class="whitespace-nowrap text-right text-lumia-ink">{{ formatDateTime(device.registeredAt) }}</dd>
            </div>
            <div class="flex justify-between gap-4">
              <dt class="shrink-0 text-lumia-ink/55">Última conexión</dt>
              <dd class="whitespace-nowrap text-right text-lumia-ink">{{ device.online ? 'Ahora' : device.lastSeenAt ? formatDateTime(device.lastSeenAt) : 'Nunca' }}</dd>
            </div>
            <div v-if="device.revokedAt" class="flex justify-between gap-4">
              <dt class="shrink-0 text-lumia-ink/55">Revocado</dt>
              <dd class="whitespace-nowrap text-right text-status-danger">{{ formatDateTime(device.revokedAt) }}</dd>
            </div>
          </dl>
          <p v-if="device.execution === 'paused' && device.status === 'active'" class="mt-4 rounded-xl bg-status-warning-soft/60 px-3 py-2 text-[12px] text-lumia-ink/75">
            La ejecución está en pausa desde el propio equipo. Lumi no puede actuar hasta que se reanude allí.
          </p>
        </BaseCard>

        <BaseCard class="lg:col-span-3">
          <h2 class="lumia-eyebrow">Capacidades</h2>
          <p v-if="device.status === 'revoked'" class="mt-3 text-[13px] text-lumia-ink/60">Equipo revocado: ya no puede conectarse ni ejecutar operaciones.</p>
          <p v-else-if="!device.capabilities" class="mt-3 text-[13px] text-lumia-ink/60">El agente aún no informó sus capacidades.</p>
          <ul v-else class="mt-3 grid gap-3 sm:grid-cols-2">
            <li v-for="engine in engines" :key="engine.key" class="rounded-xl border border-lumia-ink/[0.07] px-4 py-3">
              <p class="flex items-center gap-2 text-[14px] font-medium text-lumia-ink">
                <component :is="engine.icon" class="h-4 w-4 text-lumia-ink/60" stroke-width="1.75" aria-hidden="true" />
                {{ engine.label }}
              </p>
              <p class="mt-1 text-[12px]" :class="engine.status.available ? 'text-status-positive' : 'text-lumia-ink/55'">
                {{ engine.status.available ? `Disponible · ${engine.count} operaciones` : engineReason(engine.status.reason) }}
              </p>
            </li>
          </ul>
        </BaseCard>
      </div>

      <DesktopFilesPanel
        v-if="showFiles"
        :device-id="device.id"
        :device-name="device.name"
        :can-write="auth.can(PERMISSIONS.DESKTOP_FILES_WRITE)"
        @changed="refreshExecutions"
      />
      <p
        v-else-if="filesSupported && device.status === 'active' && !device.online"
        class="rounded-2xl border border-lumia-ink/[0.07] bg-white/60 px-5 py-4 text-[13px] text-lumia-ink/60"
      >
        Archivos: el equipo debe estar conectado para ver sus carpetas autorizadas.
      </p>

      <section aria-labelledby="executions-title">
        <div class="mb-3 flex items-end justify-between gap-3">
          <div>
            <h2 id="executions-title" class="font-display text-xl leading-tight text-lumia-ink">Historial</h2>
            <p class="mt-0.5 text-[13px] text-lumia-ink/60">Últimas 50 operaciones. Solo se guarda qué se hizo, nunca el texto escrito ni el contenido leído.</p>
          </div>
          <BaseButton variant="ghost" size="sm" :loading="executionsLoading" @click="refreshExecutions">
            <template #icon><IconRefresh class="h-4 w-4" stroke-width="1.75" aria-hidden="true" /></template>
            Actualizar
          </BaseButton>
        </div>
        <BaseCard :padded="false">
          <DataTable
            :columns="columns"
            :rows="executions"
            :row-key="(row) => row.id"
            :loading="executionsLoading"
            :error="executionsError"
            caption="Historial de operaciones"
            empty-title="Sin operaciones todavía"
            empty-description="Aparecerán aquí cuando Lumi actúe en este equipo."
            @retry="refreshExecutions"
          >
            <template #cell-operation="{ row }">
              <p class="text-lumia-ink">{{ operationLabel(row.operation) }}</p>
              <p v-if="argsLabel(row)" class="max-w-[22rem] truncate text-[12px] text-lumia-ink/55">{{ argsLabel(row) }}</p>
            </template>
            <template #cell-status="{ row }">
              <BaseBadge :tone="executionStatus(row.status).tone">{{ executionStatus(row.status).label }}</BaseBadge>
              <p v-if="row.error" class="mt-1 max-w-[18rem] truncate text-[12px] text-lumia-ink/55" :title="row.error.message">{{ row.error.code }}</p>
            </template>
            <template #cell-verification="{ row }">
              <span v-if="row.verification" :class="row.verification.verified ? 'text-status-positive' : 'text-lumia-ink/55'">
                {{ row.verification.verified ? 'Comprobado' : 'No comprobado' }}
              </span>
              <span v-else class="text-lumia-ink/40">—</span>
            </template>
            <template #cell-createdAt="{ row }">{{ formatDateTime(row.createdAt) }}</template>
            <template #cell-durationMs="{ row }">{{ formatDuration(row.durationMs) }}</template>
            <template #actions="{ row }">
              <BaseButton
                v-if="canCancel(row)"
                variant="ghost"
                size="sm"
                :loading="cancellingId === row.id"
                :disabled="Boolean(cancellingId) || row.cancelRequested"
                @click="onCancel(row)"
              >
                <template #icon><IconPlayerStop class="h-4 w-4" stroke-width="1.75" aria-hidden="true" /></template>
                {{ row.cancelRequested ? 'Cancelando…' : 'Cancelar' }}
              </BaseButton>
            </template>
          </DataTable>
        </BaseCard>
      </section>

      <DesktopApprovalList
        v-if="device.status === 'active'"
        :approvals="deviceApprovals"
        :loading="approvalsLoading"
        :error="approvalsError"
        :show-device="false"
        @removed="refreshApprovals"
        @retry="refreshApprovals"
      />

      <DesktopRenameDialog v-model:open="renameOpen" :device="device" @saved="(saved) => (device = saved)" />
    </template>
  </div>
</template>

<script setup lang="ts">
import { IconApps, IconBrowser, IconPencil, IconPlayerStop, IconPlugConnectedX, IconRefresh } from '@tabler/icons-vue'
import { PERMISSIONS } from '#shared/auth/permissions'
import { DESKTOP_OPEN_STATUSES, type DesktopApproval, type DesktopDevice, type DesktopExecution } from '#shared/schemas/desktop'
import {
  argsLabel,
  deviceState,
  engineReason,
  executionStatus,
  formatDuration,
  operationLabel,
  operationPermission,
  osLabel,
} from '~/features/desktop/utils/labels'
import type { TableColumn } from '~/types/ui'

definePageMeta({
  layout: 'admin',
  title: 'Dispositivo',
  permissions: [PERMISSIONS.DESKTOP_DEVICES_READ],
  breadcrumbs: [{ label: 'Lumi' }, { label: 'Dispositivos', to: '/desktop' }, { label: 'Detalle' }],
})

const route = useRoute()
const id = computed(() => String(route.params.id ?? ''))
const auth = useAuth()
const { request } = useAdminApi()
const toast = useToast()
const { confirm } = useConfirm()
const canManage = computed(() => auth.can(PERMISSIONS.DESKTOP_DEVICES_MANAGE))

const { data: device, status, error, refresh } = useAsyncData(`admin-desktop-device-${id.value}`, () =>
  request<DesktopDevice>(`/api/admin/desktop/devices/${id.value}`),
)
const loading = computed(() => status.value === 'pending')
const errorMessage = computed(() => (error.value ? toUiError(error.value).message : null))
const state = computed(() => (device.value ? deviceState(device.value) : { label: '', tone: 'neutral' as const }))

/** El agente anuncia las operaciones de archivos (fase 6) y el usuario puede verlas. */
const filesSupported = computed(
  () => Boolean(device.value?.capabilities?.operations.includes('files.roots')) && auth.can(PERMISSIONS.DESKTOP_FILES_READ),
)
const showFiles = computed(() => filesSupported.value && device.value?.status === 'active' && device.value.online)

const engines = computed(() => {
  const caps = device.value?.capabilities
  if (!caps) return []
  return [
    {
      key: 'browser',
      label: 'Navegador',
      icon: IconBrowser,
      status: caps.engines.browser,
      count: caps.operations.filter((o) => o.startsWith('browser.')).length,
    },
    {
      key: 'desktop',
      label: 'Aplicaciones',
      icon: IconApps,
      status: caps.engines.desktop,
      count: caps.operations.filter((o) => o.startsWith('desktop.')).length,
    },
  ]
})

const {
  data: executionsData,
  status: executionsStatus,
  error: executionsErr,
  refresh: refreshExecutions,
} = useAsyncData(`admin-desktop-executions-${id.value}`, () =>
  request<{ items: DesktopExecution[] }>(`/api/admin/desktop/devices/${id.value}/executions`),
)
const executions = computed(() => executionsData.value?.items ?? [])
const executionsLoading = computed(() => executionsStatus.value === 'pending')
const executionsError = computed(() => (executionsErr.value ? toUiError(executionsErr.value).message : null))

const columns: TableColumn[] = [
  { key: 'operation', label: 'Operación' },
  { key: 'status', label: 'Resultado' },
  { key: 'verification', label: 'Verificación', hideOnMobile: true },
  { key: 'createdAt', label: 'Fecha' },
  { key: 'durationMs', label: 'Duración', align: 'right', class: 'tabular-nums', hideOnMobile: true },
]

const {
  data: approvalsData,
  status: approvalsStatus,
  error: approvalsErr,
  refresh: refreshApprovals,
} = useAsyncData('admin-desktop-approvals', () => request<{ items: DesktopApproval[] }>('/api/admin/desktop/approvals'))
const deviceApprovals = computed(() => (approvalsData.value?.items ?? []).filter((a) => a.deviceId === id.value))
const approvalsLoading = computed(() => approvalsStatus.value === 'pending')
const approvalsError = computed(() => (approvalsErr.value ? toUiError(approvalsErr.value).message : null))

function refreshAll() {
  void refresh()
  void refreshExecutions()
  void refreshApprovals()
}

// Estado, historial y aprobaciones (pueden cambiar desde el chat de Lumi): cada 10 s mientras la
// pestaña está visible.
useVisibleInterval(refreshAll, 10_000)

function canCancel(row: DesktopExecution): boolean {
  if (!DESKTOP_OPEN_STATUSES.includes(row.status)) return false
  const permission = operationPermission(row.operation)
  return permission !== null && auth.can(permission)
}

const cancellingId = ref<string | null>(null)
async function onCancel(row: DesktopExecution) {
  cancellingId.value = row.id
  try {
    await request(`/api/admin/desktop/executions/${row.id}/cancel`, { method: 'POST', body: {} })
    toast.success('Cancelación enviada', 'El equipo detendrá la operación si aún no terminó.')
    await refreshExecutions()
  } catch (e) {
    toast.error('No se pudo cancelar', toUiError(e).message)
  } finally {
    cancellingId.value = null
  }
}

const renameOpen = ref(false)
const revoking = ref(false)
async function onRevoke() {
  if (!device.value) return
  const ok = await confirm({
    title: `¿Revocar «${device.value.name}»?`,
    description:
      'El equipo se desconectará y no podrá volver a conectarse con esta inscripción. Se borrarán sus acciones sin confirmación. Para usarlo otra vez habrá que inscribirlo de nuevo. No se puede deshacer.',
    confirmLabel: 'Revocar',
    tone: 'danger',
  })
  if (!ok) return
  revoking.value = true
  try {
    await request(`/api/admin/desktop/devices/${device.value.id}/revoke`, { method: 'POST', body: {} })
    toast.success('Equipo revocado')
    refreshAll()
  } catch (e) {
    toast.error('No se pudo revocar', toUiError(e).message)
  } finally {
    revoking.value = false
  }
}
</script>
