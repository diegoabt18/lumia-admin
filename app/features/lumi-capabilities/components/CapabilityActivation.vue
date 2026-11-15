<template>
  <div class="space-y-4">
    <p class="text-[13px] text-lumia-ink/70">
      <template v-if="capability.status === 'enabled'">Lumi usa esta herramienta en el chat.</template>
      <template v-else-if="capability.toolName">La herramienta existe, pero el chat no la usa hasta que se habilite.</template>
      <template v-else>Todavía no hay una herramienta que la implemente. Se programa en el Server con la clave <code class="rounded bg-lumia-cream/70 px-1 font-mono text-[12px]">{{ capability.key }}</code>.</template>
    </p>

    <div v-if="loading && !checks.length" class="space-y-2">
      <BaseSkeleton v-for="n in 3" :key="n" class="h-5 w-full" />
    </div>
    <p v-else-if="loadError" class="text-[13px] text-status-danger">{{ loadError }}</p>
    <ul v-else-if="capability.status !== 'enabled'" class="space-y-2">
      <li v-for="check in visibleChecks" :key="check.key" class="flex items-start gap-2 text-[13px]">
        <IconCircleCheck v-if="check.ok" class="mt-px h-4 w-4 shrink-0 text-status-positive" stroke-width="1.75" aria-hidden="true" />
        <IconCircleX v-else class="mt-px h-4 w-4 shrink-0 text-status-danger" stroke-width="1.75" aria-hidden="true" />
        <span>
          <span class="sr-only">{{ check.ok ? 'Cumple:' : 'Falta:' }}</span>
          <span class="text-lumia-ink/85">{{ check.label }}</span>
          <span v-if="check.detail" class="block text-[12px] text-lumia-ink/50">{{ check.detail }}</span>
        </span>
      </li>
    </ul>

    <template v-if="canEnablePermission">
      <template v-if="capability.status === 'enabled'">
        <BaseButton variant="secondary" size="sm" :loading="busy" @click="onDisable">
          <template #icon><IconPlayerPause class="h-4 w-4" stroke-width="1.75" aria-hidden="true" /></template>
          Deshabilitar
        </BaseButton>
      </template>
      <template v-else-if="capability.toolName">
        <BaseCheckbox :id="`${formId}-documented`" v-model="documented">
          Confirmo que la capacidad está documentada (qué hace, permiso y límites)
        </BaseCheckbox>
        <div>
          <BaseButton size="sm" :loading="busy" :disabled="!readyExceptDocs || !documented" @click="onEnable">
            <template #icon><IconPower class="h-4 w-4" stroke-width="1.75" aria-hidden="true" /></template>
            Habilitar en el chat
          </BaseButton>
          <p v-if="!readyExceptDocs" class="mt-2 text-[12px] text-lumia-ink/50">Se habilita cuando todos los requisitos se cumplen.</p>
        </div>
      </template>
    </template>
    <p v-else class="text-[12px] text-lumia-ink/50">Habilitar o deshabilitar requiere el permiso «lumi.capabilities.enable».</p>
  </div>
</template>

<script setup lang="ts">
import { IconCircleCheck, IconCircleX, IconPlayerPause, IconPower } from '@tabler/icons-vue'
import { PERMISSIONS } from '#shared/auth/permissions'
import {
  capabilityResponseSchema,
  enablementResponseSchema,
  type Capability,
} from '#shared/schemas/lumi-capabilities'

const props = defineProps<{ capability: Capability }>()
const emit = defineEmits<{ changed: [capability: Capability] }>()

const auth = useAuth()
const { request } = useAdminApi()
const toast = useToast()
const { confirm } = useConfirm()
const formId = useId()
const canEnablePermission = computed(() => auth.can(PERMISSIONS.LUMI_CAPABILITIES_ENABLE))

const { data, status, error, refresh } = useAsyncData(
  () => `admin-lumi-capability-enablement-${props.capability.id}`,
  () => request<unknown>(`/api/admin/lumi/capabilities/${props.capability.id}/enablement`).then((raw) => enablementResponseSchema.parse(raw)),
  // Tras una batería o un cambio de estado los requisitos cambian.
  { watch: [() => props.capability.status, () => props.capability.lastTest?.runId] },
)
const checks = computed(() => data.value?.checks ?? [])
const loading = computed(() => status.value === 'pending')
const loadError = computed(() => (error.value ? toUiError(error.value).message : null))
/** La documentación se confirma aquí, con la casilla; el resto lo decide el Server. */
const visibleChecks = computed(() => checks.value.filter((c) => c.key !== 'documented'))
const readyExceptDocs = computed(() => visibleChecks.value.length > 0 && visibleChecks.value.every((c) => c.ok))

const documented = ref(false)
const busy = ref(false)

async function onEnable() {
  const ok = await confirm({
    title: 'Habilitar en el chat',
    description: `Lumi empezará a usar «${props.capability.title}» con todos los usuarios que tengan su permiso. Puedes deshabilitarla cuando quieras.`,
    confirmLabel: 'Habilitar',
  })
  if (!ok) return
  busy.value = true
  try {
    const { capability } = capabilityResponseSchema.parse(
      await request<unknown>(`/api/admin/lumi/capabilities/${props.capability.id}/enable`, { method: 'POST', body: { documented: true } }),
    )
    toast.success('Capacidad habilitada', 'El chat la usa ya en este servidor; en los demás, en menos de un minuto.')
    documented.value = false
    emit('changed', capability)
  } catch (e) {
    toast.error('No se pudo habilitar', toUiError(e).message)
    await refresh()
  } finally {
    busy.value = false
  }
}

async function onDisable() {
  const ok = await confirm({
    title: 'Deshabilitar',
    description: `Lumi dejará de usar «${props.capability.title}» en el chat. Podrás volver a habilitarla mientras su última batería siga aprobada.`,
    confirmLabel: 'Deshabilitar',
    tone: 'danger',
  })
  if (!ok) return
  busy.value = true
  try {
    const { capability } = capabilityResponseSchema.parse(
      await request<unknown>(`/api/admin/lumi/capabilities/${props.capability.id}/disable`, { method: 'POST', body: {} }),
    )
    toast.success('Capacidad deshabilitada')
    emit('changed', capability)
  } catch (e) {
    toast.error('No se pudo deshabilitar', toUiError(e).message)
  } finally {
    busy.value = false
  }
}
</script>
