<template>
  <div>
    <PageHeader
      eyebrow="Lumi"
      title="Teléfonos"
      description="Teléfonos con LumiChat en los que entraste con tu cuenta. Reciben los avisos de pedidos mientras su sesión siga abierta."
    />

    <div v-if="loading && !items.length" class="space-y-3">
      <BaseSkeleton v-for="n in 2" :key="n" class="h-20 w-full" />
    </div>
    <ErrorState v-else-if="errorMessage && !items.length" :message="errorMessage" @retry="refresh" />
    <BaseCard v-else-if="!items.length">
      <EmptyState
        title="No hay teléfonos registrados"
        description="Instala LumiChat en tu teléfono y entra con esta misma cuenta para recibir los avisos de pedidos."
      />
    </BaseCard>

    <BaseCard v-else>
      <ul class="divide-y divide-lumia-ink/[0.05]">
        <li
          v-for="device in items"
          :key="device.id"
          class="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between"
        >
          <div class="flex min-w-0 items-start gap-3">
            <span class="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-lumia-cream text-lumia-ink" aria-hidden="true">
              <IconDeviceMobile class="h-[18px] w-[18px]" stroke-width="1.6" />
            </span>
            <div class="min-w-0 space-y-1">
              <div class="flex flex-wrap items-center gap-2">
                <p class="font-medium text-lumia-ink">{{ device.deviceLabel || platformLabel(device.platform) }}</p>
                <BaseBadge :tone="statusOf(device).tone">{{ statusOf(device).label }}</BaseBadge>
              </div>
              <p class="text-[12px] text-lumia-ink/55">
                {{ platformLabel(device.platform) }}<span v-if="device.appVersion"> · LumiChat {{ device.appVersion }}</span>
                · Última conexión {{ formatDateTime(device.lastSeenAt) }}
              </p>
            </div>
          </div>

          <BaseButton
            v-if="device.active"
            variant="secondary"
            size="sm"
            :loading="busyId === device.id"
            :disabled="Boolean(busyId)"
            @click="onStop(device)"
          >
            Dejar de enviar avisos
          </BaseButton>
        </li>
      </ul>
      <p class="border-t border-lumia-ink/[0.05] px-5 py-3 text-[12px] leading-relaxed text-lumia-ink/55">
        Dejar de enviar avisos no cierra la sesión del teléfono: LumiChat lo vuelve a activar la próxima vez que
        se abra. Para cerrar la sesión, hazlo desde Ajustes en el propio teléfono.
      </p>
    </BaseCard>
  </div>
</template>

<script setup lang="ts">
import { PERMISSIONS } from '#shared/auth/permissions'
import { lumiMobileDeviceListSchema, type LumiMobileDevice } from '#shared/schemas/lumi'
import { IconDeviceMobile } from '@tabler/icons-vue'
import { formatDateTime } from '~/features/lumi-admin/utils/format'

definePageMeta({
  layout: 'admin',
  title: 'Teléfonos',
  permissions: [PERMISSIONS.LUMI_USE],
  breadcrumbs: [{ label: 'Lumi' }, { label: 'Teléfonos' }],
})

type BadgeTone = 'neutral' | 'positive' | 'warning'

const { request } = useAdminApi()
const toast = useToast()
const { confirm } = useConfirm()

const { data, status, error, refresh } = useAsyncData('admin-lumi-mobile-devices', async () =>
  lumiMobileDeviceListSchema.parse(await request<unknown>('/api/admin/lumi/mobile-devices')),
)

const items = computed<LumiMobileDevice[]>(() => data.value?.items ?? [])
const loading = computed(() => status.value === 'pending')
const errorMessage = computed(() => (error.value ? toUiError(error.value).message : null))

function platformLabel(platform: LumiMobileDevice['platform']): string {
  return platform === 'ios' ? 'iPhone' : 'Android'
}

function statusOf(device: LumiMobileDevice): { label: string; tone: BadgeTone } {
  if (device.receivesPush) return { label: 'Recibe avisos', tone: 'positive' }
  if (device.active) return { label: 'Sesión cerrada', tone: 'warning' }
  return { label: 'Sin avisos', tone: 'neutral' }
}

const busyId = ref<string | null>(null)

async function onStop(device: LumiMobileDevice) {
  const ok = await confirm({
    title: '¿Dejar de enviar avisos a este teléfono?',
    description: 'No recibirá más avisos de pedidos hasta que vuelvas a abrir LumiChat en él.',
    confirmLabel: 'Dejar de enviar',
    tone: 'danger',
  })
  if (!ok) return
  busyId.value = device.id
  try {
    await request<{ ok: true }>(`/api/admin/lumi/mobile-devices/${device.id}`, { method: 'DELETE' })
    toast.success('Avisos desactivados en ese teléfono')
    await refresh()
  } catch (e) {
    toast.error('No se pudo desactivar', toUiError(e).message)
  } finally {
    busyId.value = null
  }
}
</script>
