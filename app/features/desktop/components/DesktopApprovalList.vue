<template>
  <BaseCard>
    <div class="flex flex-wrap items-start justify-between gap-3">
      <div>
        <h2 class="font-display text-xl leading-tight text-lumia-ink">Acciones sin confirmación</h2>
        <p class="mt-1 max-w-prose text-[13px] leading-relaxed text-lumia-ink/60">
          Lo que marcaste en Lumi como «no volver a preguntar». Al quitar una, Lumi vuelve a pedir confirmación. Los permisos se comprueban siempre.
        </p>
      </div>
    </div>

    <div v-if="loading && !approvals.length" class="mt-4 space-y-2">
      <BaseSkeleton v-for="n in 2" :key="n" class="h-12 w-full" />
    </div>
    <ErrorState v-else-if="error && !approvals.length" class="mt-4" :message="error" @retry="emit('retry')" />
    <p v-else-if="!approvals.length" class="mt-4 rounded-xl bg-lumia-cream/50 px-4 py-3 text-[13px] text-lumia-ink/60">
      No hay ninguna: Lumi pide confirmación para cada acción.
    </p>
    <ul v-else class="mt-4 divide-y divide-lumia-ink/[0.06]">
      <li v-for="a in approvals" :key="a.id" class="flex flex-wrap items-center justify-between gap-3 py-3">
        <div class="min-w-0">
          <p class="text-[14px] text-lumia-ink">
            {{ approvalKindLabel(a.kind) }} · <span class="break-all font-medium">{{ a.target }}</span>
          </p>
          <p class="text-[12px] text-lumia-ink/55">
            <template v-if="showDevice">{{ deviceName(a.deviceId) }} · </template>Desde {{ formatDateTime(a.createdAt) }}
          </p>
        </div>
        <BaseButton variant="ghost" size="sm" :loading="removingId === a.id" :disabled="Boolean(removingId)" @click="remove(a)">
          Volver a preguntar
        </BaseButton>
      </li>
    </ul>
  </BaseCard>
</template>

<script setup lang="ts">
import type { DesktopApproval, DesktopDevice } from '#shared/schemas/desktop'
import { approvalKindLabel } from '~/features/desktop/utils/labels'

const props = withDefaults(
  defineProps<{
    approvals: DesktopApproval[]
    devices?: DesktopDevice[]
    loading?: boolean
    error?: string | null
    showDevice?: boolean
  }>(),
  { devices: () => [], loading: false, error: null, showDevice: true },
)
const emit = defineEmits<{ removed: []; retry: [] }>()

const { request } = useAdminApi()
const toast = useToast()
const removingId = ref<string | null>(null)

function deviceName(id: string): string {
  return props.devices.find((d) => d.id === id)?.name ?? 'Equipo'
}

// Quitar una aprobación solo restringe; no hace falta confirmarlo.
async function remove(a: DesktopApproval) {
  removingId.value = a.id
  try {
    await request(`/api/admin/desktop/approvals/${a.id}`, { method: 'DELETE' })
    toast.success('Lumi volverá a preguntar', `${approvalKindLabel(a.kind)} · ${a.target}`)
    emit('removed')
  } catch (e) {
    toast.error('No se pudo quitar', toUiError(e).message)
  } finally {
    removingId.value = null
  }
}
</script>
