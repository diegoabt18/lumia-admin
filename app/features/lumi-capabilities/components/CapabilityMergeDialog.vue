<template>
  <BaseDialog
    v-model:open="open"
    title="Fusionar con otra capacidad"
    description="Esta capacidad quedará como «Fusionada» y sus peticiones, contador y frases pasarán a la que elijas. No se puede deshacer desde el panel."
    size="lg"
    :busy="merging"
  >
    <div class="space-y-4">
      <FormField :id="`${formId}-search`" label="Buscar la capacidad destino" hint="Por título, descripción o frase pedida.">
        <template #default="{ id, describedBy }">
          <BaseInput :id="id" v-model="search" type="search" maxlength="100" :described-by="describedBy" :disabled="merging" />
        </template>
      </FormField>

      <div class="max-h-80 overflow-y-auto rounded-xl border border-lumia-ink/[0.08]">
        <div v-if="loading && !candidates.length" class="space-y-2 p-3">
          <BaseSkeleton v-for="n in 3" :key="n" class="h-12 w-full" />
        </div>
        <ErrorState v-else-if="loadError" :message="loadError" @retry="refresh" />
        <EmptyState v-else-if="!candidates.length" compact title="Sin capacidades para fusionar" description="Prueba con otra búsqueda." />
        <fieldset v-else>
          <legend class="sr-only">Capacidad destino</legend>
          <label
            v-for="item in candidates"
            :key="item.id"
            class="flex cursor-pointer items-start gap-3 border-b border-lumia-ink/[0.05] px-4 py-3 last:border-b-0 hover:bg-lumia-cream/50"
            :class="targetId === item.id ? 'bg-lumia-cream/70' : ''"
          >
            <input v-model="targetId" type="radio" name="merge-target" :value="item.id" class="mt-1 accent-lumia-gold" :disabled="merging" />
            <span class="min-w-0 flex-1">
              <span class="flex flex-wrap items-center gap-2">
                <span class="font-medium text-lumia-ink">{{ item.title }}</span>
                <BaseBadge v-if="item.id === suggestedId" tone="warning">Sugerida</BaseBadge>
                <BaseBadge :tone="CAPABILITY_STATUS_META[item.status].tone">{{ CAPABILITY_STATUS_META[item.status].label }}</BaseBadge>
              </span>
              <span class="mt-0.5 block text-[12px] text-lumia-ink/50">
                {{ CAPABILITY_MODULE_LABELS[item.module] }} · pedida {{ item.requestCount }} {{ item.requestCount === 1 ? 'vez' : 'veces' }}
              </span>
            </span>
          </label>
        </fieldset>
      </div>

      <p v-if="formError" role="alert" class="rounded-xl border border-status-danger/20 bg-status-danger-soft/50 px-4 py-3 text-[13px] text-status-danger">
        {{ formError }}
      </p>
    </div>

    <template #footer>
      <BaseButton variant="secondary" :disabled="merging" @click="open = false">Cancelar</BaseButton>
      <BaseButton variant="danger" :loading="merging" :disabled="!selectable" @click="onMerge">Fusionar</BaseButton>
    </template>
  </BaseDialog>
</template>

<script setup lang="ts">
import {
  CAPABILITY_MODULE_LABELS,
  CAPABILITY_STATUS_META,
  capabilityListResponseSchema,
  capabilityResponseSchema,
  type Capability,
  type CapabilitySummary,
} from '#shared/schemas/lumi-capabilities'

const props = defineProps<{ capability: Capability | null }>()
const emit = defineEmits<{ merged: [target: Capability] }>()
const open = defineModel<boolean>('open', { default: false })

const { request } = useAdminApi()
const toast = useToast()
const formId = useId()

const search = ref('')
const debounced = ref('')
let timer: ReturnType<typeof setTimeout> | undefined
watch(search, (value) => {
  clearTimeout(timer)
  timer = setTimeout(() => (debounced.value = value.trim()), 300)
})
onBeforeUnmount(() => clearTimeout(timer))

const targetId = ref<string>('')
const formError = ref<string | null>(null)
const merging = ref(false)
const suggestedId = computed(() => props.capability?.possibleDuplicateOf ?? null)

/** Las ya fusionadas no pueden recibir una fusión (el Server lo rechaza). */
const NOT_TARGETS = new Set(['duplicate'])

const { data, status, error, refresh } = useAsyncData(
  () => `admin-lumi-capability-merge-${props.capability?.id ?? 'none'}`,
  async () => {
    if (!open.value || !props.capability) return { items: [] as CapabilitySummary[] }
    const raw = await request<unknown>('/api/admin/lumi/capabilities', {
      query: { search: debounced.value || undefined, limit: 20, sort: 'requests' },
    })
    return capabilityListResponseSchema.parse(raw)
  },
  { watch: [debounced, open], immediate: false },
)
const loading = computed(() => status.value === 'pending')
const loadError = computed(() => (error.value ? toUiError(error.value).message : null))

const candidates = computed<CapabilitySummary[]>(() => {
  const items = (data.value?.items ?? []).filter((c) => c.id !== props.capability?.id && !NOT_TARGETS.has(c.status))
  // La sugerida (posible duplicado) primero.
  return [...items].sort((a, b) => Number(b.id === suggestedId.value) - Number(a.id === suggestedId.value))
})

/** Solo se fusiona con una capacidad que se está viendo en la lista (la búsqueda puede ocultar la elegida). */
const selectable = computed(() => candidates.value.some((c) => c.id === targetId.value))

watch(open, (value) => {
  if (!value) return
  search.value = ''
  debounced.value = ''
  formError.value = null
  targetId.value = suggestedId.value ?? ''
})

async function onMerge() {
  if (!props.capability || !selectable.value || merging.value) return
  merging.value = true
  formError.value = null
  try {
    const { capability } = capabilityResponseSchema.parse(
      await request<unknown>(`/api/admin/lumi/capabilities/${props.capability.id}/merge`, {
        method: 'POST',
        body: { targetId: targetId.value },
      }),
    )
    toast.success('Capacidades fusionadas', `Ahora todo está en «${capability.title}».`)
    open.value = false
    emit('merged', capability)
  } catch (e) {
    formError.value = toUiError(e).message
  } finally {
    merging.value = false
  }
}
</script>
