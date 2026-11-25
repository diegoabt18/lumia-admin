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
import type { DesktopDeviceListResponse } from '#shared/schemas/desktop'
import { deviceState, osLabel } from '~/features/desktop/utils/labels'
import { useDeviceListPolling } from '~/features/desktop/composables/useDeviceListPolling'
import { useApprovalsPolling } from '~/features/desktop/composables/useApprovalsPolling'

definePageMeta({
  layout: 'admin',
  title: 'Dispositivos',
  permissions: [PERMISSIONS.DESKTOP_DEVICES_READ],
  breadcrumbs: [{ label: 'Lumi' }, { label: 'Dispositivos' }],
})

const auth = useAuth()
const canManage = computed(() => auth.can(PERMISSIONS.DESKTOP_DEVICES_MANAGE))

// Polling optimizado para listado de dispositivos (30s en lugar de 10s)
const {
  devices,
  enabled,
  loading,
  error: listError,
  refresh,
} = useDeviceListPolling()
const errorMessage = computed(() => (listError.value ? listError.value : null))

// Approvals centralizado: evita duplicación entre páginas
const {
  approvals,
  loading: approvalsLoading,
  error: approvalsError,
  refresh: refreshApprovals,
} = useApprovalsPolling()

function refreshAll() {
  void refresh()
  void refreshApprovals()
}

const enrollOpen = ref(false)
</script>
