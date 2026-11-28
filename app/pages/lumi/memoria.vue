<template>
  <div>
    <PageHeader
      eyebrow="Lumi"
      title="Memoria"
      description="Lo que le pediste a Lumi que recuerde. Lumi lo usa como datos en sus respuestas; corregir guarda una versión nueva y olvidar deja constancia."
    >
      <template #actions>
        <div class="inline-flex rounded-xl border border-lumia-ink/10 bg-white p-1" role="tablist" aria-label="Filtro">
          <button
            v-for="option in filters"
            :key="option.value"
            type="button"
            role="tab"
            :aria-selected="filter === option.value"
            class="rounded-lg px-3 py-1.5 text-[13px] font-medium transition-colors"
            :class="filter === option.value ? 'bg-lumia-ink text-white' : 'text-lumia-ink/65 hover:text-lumia-ink'"
            @click="filter = option.value"
          >
            {{ option.label }}
          </button>
        </div>
      </template>
    </PageHeader>

    <BaseCard class="mb-6" title="Añadir un recuerdo" description="También puedes decirle en el chat «recuerda que…».">
      <form class="flex flex-col gap-3 sm:flex-row sm:items-start" @submit.prevent="add">
        <div class="sm:w-44">
          <BaseSelect id="memory-kind" v-model="draftKind" :options="kindOptions" aria-label="Tipo" />
        </div>
        <div class="flex-1">
          <BaseInput
            id="memory-text"
            v-model="draftText"
            placeholder="Ej.: Prefiero los reportes de ventas los lunes"
            :invalid="Boolean(draftError)"
            aria-label="Recuerdo"
          />
          <p v-if="draftError" class="mt-1 text-[12px] text-status-danger" role="alert">{{ draftError }}</p>
        </div>
        <BaseButton type="submit" :loading="adding">Guardar</BaseButton>
      </form>
    </BaseCard>

    <div v-if="loading && !items.length" class="space-y-3">
      <BaseSkeleton v-for="n in 3" :key="n" class="h-20 w-full" />
    </div>
    <ErrorState v-else-if="errorMessage && !items.length" :message="errorMessage" @retry="refresh" />
    <BaseCard v-else-if="!items.length">
      <EmptyState
        :title="filter === 'active' ? 'Lumi aún no recuerda nada tuyo' : 'Sin recuerdos'"
        description="Dile en el chat «recuerda que prefiero los reportes cortos» o añádelo aquí arriba."
      />
    </BaseCard>

    <BaseCard v-else>
      <ul class="divide-y divide-lumia-ink/[0.05]">
        <li v-for="item in items" :key="item.id" class="space-y-2 px-5 py-4">
          <div class="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div class="min-w-0 flex-1 space-y-1">
              <div class="flex flex-wrap items-center gap-2">
                <BaseBadge tone="info">{{ KIND_LABELS[item.kind] }}</BaseBadge>
                <BaseBadge v-if="item.status !== 'active'" tone="neutral">{{ STATUS_LABELS[item.status] }}</BaseBadge>
                <span v-if="item.version > 1" class="text-[12px] text-lumia-ink/45">Versión {{ item.version }}</span>
              </div>
              <template v-if="editingId === item.id">
                <BaseInput :id="`edit-${item.id}`" v-model="editText" :invalid="Boolean(editError)" aria-label="Corregir recuerdo" />
                <p v-if="editError" class="text-[12px] text-status-danger" role="alert">{{ editError }}</p>
              </template>
              <p v-else class="text-[14px] leading-relaxed text-lumia-ink" :class="{ 'line-through opacity-60': item.status !== 'active' }">
                {{ item.text }}
              </p>
              <p class="text-[12px] text-lumia-ink/55">
                {{ sourceLabel(item) }} · {{ formatDateTime(item.createdAt) }}
              </p>
            </div>

            <div v-if="item.status === 'active'" class="flex shrink-0 items-center gap-2">
              <template v-if="editingId === item.id">
                <BaseButton variant="secondary" size="sm" :disabled="busy" @click="editingId = null">Cancelar</BaseButton>
                <BaseButton size="sm" :loading="busy" @click="saveEdit(item)">Guardar</BaseButton>
              </template>
              <template v-else>
                <BaseButton v-if="item.version > 1" variant="secondary" size="sm" @click="toggleHistory(item)">
                  {{ historyFor === item.id ? 'Ocultar historial' : 'Historial' }}
                </BaseButton>
                <BaseButton variant="secondary" size="sm" :disabled="busy" @click="startEdit(item)">Corregir</BaseButton>
                <BaseButton variant="secondary" size="sm" :disabled="busy" @click="forget(item)">Olvidar</BaseButton>
              </template>
            </div>
          </div>

          <ol v-if="historyFor === item.id" class="space-y-1 rounded-xl bg-lumia-cream/60 px-4 py-3 text-[13px] text-lumia-ink/75">
            <li v-for="version in history" :key="version.id">
              <span class="font-medium">v{{ version.version }}</span> · {{ version.text }}
              <span class="text-lumia-ink/45">({{ formatDateTime(version.createdAt) }})</span>
            </li>
          </ol>
        </li>
      </ul>
    </BaseCard>
  </div>
</template>

<script setup lang="ts">
import { PERMISSIONS } from '#shared/auth/permissions'
import {
  LUMI_MEMORY_KINDS,
  lumiMemoryCorrectSchema,
  lumiMemoryCreateSchema,
  lumiMemoryListSchema,
  type LumiMemory,
} from '#shared/schemas/lumi'
import { formatDateTime } from '~/features/lumi-admin/utils/format'

definePageMeta({
  layout: 'admin',
  title: 'Memoria',
  permissions: [PERMISSIONS.LUMI_USE],
  breadcrumbs: [{ label: 'Lumi' }, { label: 'Memoria' }],
})

type Kind = LumiMemory['kind']
type Filter = 'active' | 'all'

const KIND_LABELS: Record<Kind, string> = {
  preference: 'Preferencia',
  fact: 'Dato',
  commitment: 'Compromiso',
  decision: 'Decisión',
}
const STATUS_LABELS: Record<LumiMemory['status'], string> = {
  active: 'Activo',
  superseded: 'Corregido',
  forgotten: 'Olvidado',
}
const kindOptions = LUMI_MEMORY_KINDS.map((k) => ({ value: k, label: KIND_LABELS[k] }))
const filters: Array<{ value: Filter; label: string }> = [
  { value: 'active', label: 'Activos' },
  { value: 'all', label: 'Todo el historial' },
]

const { request } = useAdminApi()
const toast = useToast()
const { confirm } = useConfirm()

const filter = ref<Filter>('active')
const { data, status, error, refresh } = useAsyncData(
  'admin-lumi-memory',
  async () => lumiMemoryListSchema.parse(await request<unknown>('/api/admin/lumi/memory', { query: { status: filter.value } })),
  { watch: [filter] },
)
const items = computed<LumiMemory[]>(() => data.value?.items ?? [])
const loading = computed(() => status.value === 'pending')
const errorMessage = computed(() => (error.value ? toUiError(error.value).message : null))

function sourceLabel(item: LumiMemory): string {
  if (item.source.via === 'panel') return 'Añadido en Lumia Admin'
  return item.source.phrase ? `Del chat: «${item.source.phrase}»` : 'Del chat'
}

const draftKind = ref<Kind>('preference')
const draftText = ref('')
const draftError = ref<string | null>(null)
const adding = ref(false)

async function add() {
  const parsed = lumiMemoryCreateSchema.safeParse({ kind: draftKind.value, text: draftText.value })
  if (!parsed.success) {
    draftError.value = parsed.error.issues[0]?.message ?? 'Revisa el texto'
    return
  }
  draftError.value = null
  adding.value = true
  try {
    await request('/api/admin/lumi/memory', { method: 'POST', body: parsed.data })
    draftText.value = ''
    toast.success('Lumi lo recordará')
    await refresh()
  } catch (e) {
    toast.error('No se pudo guardar', toUiError(e).message)
  } finally {
    adding.value = false
  }
}

const editingId = ref<string | null>(null)
const editText = ref('')
const editError = ref<string | null>(null)
const busy = ref(false)

function startEdit(item: LumiMemory) {
  editingId.value = item.id
  editText.value = item.text
  editError.value = null
}

async function saveEdit(item: LumiMemory) {
  const parsed = lumiMemoryCorrectSchema.safeParse({ text: editText.value })
  if (!parsed.success) {
    editError.value = parsed.error.issues[0]?.message ?? 'Revisa el texto'
    return
  }
  busy.value = true
  try {
    await request(`/api/admin/lumi/memory/${item.id}`, { method: 'PUT', body: parsed.data })
    editingId.value = null
    toast.success('Recuerdo corregido', 'La versión anterior queda en el historial.')
    await refresh()
  } catch (e) {
    toast.error('No se pudo corregir', toUiError(e).message)
  } finally {
    busy.value = false
  }
}

async function forget(item: LumiMemory) {
  const ok = await confirm({
    title: '¿Olvidar este recuerdo?',
    description: 'Lumi dejará de usarlo. Seguirá visible en «Todo el historial».',
    confirmLabel: 'Olvidar',
    tone: 'danger',
  })
  if (!ok) return
  busy.value = true
  try {
    await request(`/api/admin/lumi/memory/${item.id}`, { method: 'DELETE' })
    toast.success('Lumi lo olvidó')
    await refresh()
  } catch (e) {
    toast.error('No se pudo olvidar', toUiError(e).message)
  } finally {
    busy.value = false
  }
}

const historyFor = ref<string | null>(null)
const history = ref<LumiMemory[]>([])

async function toggleHistory(item: LumiMemory) {
  if (historyFor.value === item.id) {
    historyFor.value = null
    return
  }
  try {
    history.value = lumiMemoryListSchema.parse(await request<unknown>(`/api/admin/lumi/memory/${item.id}/history`)).items
    historyFor.value = item.id
  } catch (e) {
    toast.error('No se pudo cargar el historial', toUiError(e).message)
  }
}
</script>
