<template>
  <div class="space-y-8">
    <PageHeader
      eyebrow="Lumi"
      title="Dispositivos"
      description="Tus equipos con Lumia Desktop Agent. Lumi puede abrir páginas y usar aplicaciones en ellos cuando se lo pides."
    >
      <template v-if="canManage && enabled" #actions>
        <BaseButton @click="enrollOpen = true">
          <template #icon><IconPlus class="h-4 w-4" stroke-width="2" aria-hidden="true" /></template>
          Inscribir equipo
        </BaseButton>
      </template>
    </PageHeader>

    <div v-if="loading && !devices.length" class="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      <BaseSkeleton v-for="n in 2" :key="n" class="h-48 w-full" />
    </div>
    <ErrorState v-else-if="errorMessage && !devices.length" :message="errorMessage" @retry="refreshAll" />
    <BaseCard v-else-if="!enabled">
      <EmptyState
        title="El agente de escritorio no está activado"
        description="El servidor de Lumia no tiene activado Lumia Desktop Agent (DESKTOP_AGENT_ENABLED). Cuando lo esté, podrás inscribir equipos aquí."
      />
    </BaseCard>
    <BaseCard v-else-if="!devices.length">
      <EmptyState
        title="Aún no tienes equipos"
        :description="canManage ? 'Inscribe tu computador para que Lumi pueda ayudarte en él.' : 'Pide a un administrador el permiso para inscribir equipos.'"
      />
    </BaseCard>

    <ul v-else class="grid gap-4 md:grid-cols-2 xl:grid-cols-3" aria-label="Equipos">
      <li v-for="d in devices" :key="d.id">
        <NuxtLink
          :to="`/desktop/${d.id}`"
          class="group flex h-full flex-col rounded-2xl border border-lumia-ink/[0.07] bg-white/80 p-5 shadow-soft transition-colors hover:border-lumia-gold/50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lumia-gold/70"
          :class="d.status === 'revoked' && 'opacity-60'"
        >
          <div class="flex items-start justify-between gap-3">
            <span class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-lumia-cream text-lumia-ink/70">
              <IconDeviceDesktop class="h-5 w-5" stroke-width="1.5" aria-hidden="true" />
            </span>
            <BaseBadge :tone="deviceState(d).tone">{{ deviceState(d).label }}</BaseBadge>
          </div>
          <p class="mt-4 truncate font-display text-xl leading-tight text-lumia-ink group-hover:text-lumia-ink">{{ d.name }}</p>
          <p class="mt-0.5 text-[12px] text-lumia-ink/55">{{ osLabel(d) }}</p>
          <div v-if="d.capabilities && d.status === 'active'" class="mt-4 flex flex-wrap gap-1.5">
            <BaseBadge :tone="d.capabilities.engines.browser.available ? 'gold' : 'neutral'">
              <IconBrowser class="mr-1 h-3 w-3" stroke-width="1.75" aria-hidden="true" />
              {{ d.capabilities.engines.browser.available ? 'Navegador' : 'Navegador no disponible' }}
            </BaseBadge>
            <BaseBadge :tone="d.capabilities.engines.desktop.available ? 'gold' : 'neutral'">
              <IconApps class="mr-1 h-3 w-3" stroke-width="1.75" aria-hidden="true" />
              {{ d.capabilities.engines.desktop.available ? 'Aplicaciones' : 'Aplicaciones no disponibles' }}
            </BaseBadge>
          </div>
          <p class="mt-auto pt-4 text-[12px] text-lumia-ink/50">
            {{ d.status === 'revoked' ? `Revocado ${d.revokedAt ? formatDateTime(d.revokedAt) : ''}` : d.online ? `Agente ${d.agentVersion}` : d.lastSeenAt ? `Visto por última vez ${formatDateTime(d.lastSeenAt)}` : 'Nunca se conectó' }}
          </p>
        </NuxtLink>
      </li>
    </ul>

    <DesktopApprovalList
      v-if="enabled && devices.length"
      :approvals="approvals"
      :devices="devices"
      :loading="approvalsLoading"
      :error="approvalsError"
      @removed="refreshApprovals"
      @retry="refreshApprovals"
    />

    <DesktopEnrollDialog v-model:open="enrollOpen" @closed="refresh" />
  </div>
</template>

<script setup lang="ts">
import { IconApps, IconBrowser, IconDeviceDesktop, IconPlus } from '@tabler/icons-vue'
import { PERMISSIONS } from '#shared/auth/permissions'
import type { DesktopApproval, DesktopDeviceListResponse } from '#shared/schemas/desktop'
import { deviceState, osLabel } from '~/features/desktop/utils/labels'

definePageMeta({
  layout: 'admin',
  title: 'Dispositivos',
  permissions: [PERMISSIONS.DESKTOP_DEVICES_READ],
  breadcrumbs: [{ label: 'Lumi' }, { label: 'Dispositivos' }],
})

const auth = useAuth()
const { request } = useAdminApi()
const canManage = computed(() => auth.can(PERMISSIONS.DESKTOP_DEVICES_MANAGE))

const { data, status, error, refresh } = useAsyncData('admin-desktop-devices', () =>
  request<DesktopDeviceListResponse>('/api/admin/desktop/devices'),
)
// Activos primero; los revocados quedan al final como historial.
const devices = computed(() =>
  [...(data.value?.items ?? [])].sort((a, b) => Number(a.status === 'revoked') - Number(b.status === 'revoked')),
)
const enabled = computed(() => data.value?.enabled ?? true)
const loading = computed(() => status.value === 'pending')
const errorMessage = computed(() => (error.value ? toUiError(error.value).message : null))

const {
  data: approvalsData,
  status: approvalsStatus,
  error: approvalsErr,
  refresh: refreshApprovals,
} = useAsyncData('admin-desktop-approvals', () => request<{ items: DesktopApproval[] }>('/api/admin/desktop/approvals'))
const approvals = computed(() => approvalsData.value?.items ?? [])
const approvalsLoading = computed(() => approvalsStatus.value === 'pending')
const approvalsError = computed(() => (approvalsErr.value ? toUiError(approvalsErr.value).message : null))

function refreshAll() {
  void refresh()
  void refreshApprovals()
}

// Estado en línea y aprobaciones (pueden cambiar desde el chat de Lumi): cada 10 s mientras la
// pestaña está visible.
useVisibleInterval(refreshAll, 10_000)

const enrollOpen = ref(false)
</script>
