<template>
  <div>
    <PageHeader
      eyebrow="Lumi"
      title="Objetivos"
      description="Lo que quieres conseguir, con sus pasos. Lumi te avisa si un objetivo lleva una semana sin avances y lo evalúa al vencer; también puede proponerte pasos, que solo se añaden si los apruebas."
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

    <BaseCard class="mb-6" title="Nuevo objetivo" description="En el chat puedes preguntar «¿cómo van mis objetivos?».">
      <form class="space-y-3" @submit.prevent="create">
        <div class="grid gap-3 sm:grid-cols-[1fr_11rem]">
          <FormField label="Objetivo" id="goal-title" :error="draftError ?? undefined" required>
            <template #default="{ describedBy }">
              <BaseInput
                id="goal-title"
                v-model="draftTitle"
                placeholder="Ej.: Subir el ticket medio a $120.000"
                :invalid="Boolean(draftError)"
                :described-by="describedBy"
              />
            </template>
          </FormField>
          <FormField label="Fecha límite" id="goal-date" hint="Opcional">
            <template #default="{ describedBy }">
              <BaseInput id="goal-date" v-model="draftDate" type="date" :min="today" :described-by="describedBy" />
            </template>
          </FormField>
        </div>
        <FormField label="Detalle" id="goal-description" hint="Opcional: contexto para ti y para los pasos que proponga Lumi">
          <template #default="{ describedBy }">
            <BaseTextarea id="goal-description" v-model="draftDescription" :rows="2" :described-by="describedBy" />
          </template>
        </FormField>
        <div class="flex justify-end">
          <BaseButton type="submit" :loading="creating">Crear objetivo</BaseButton>
        </div>
      </form>
    </BaseCard>

    <div v-if="loading && !items.length" class="space-y-3">
      <BaseSkeleton v-for="n in 2" :key="n" class="h-40 w-full" />
    </div>
    <ErrorState v-else-if="errorMessage && !items.length" :message="errorMessage" @retry="refresh" />
    <BaseCard v-else-if="!items.length">
      <EmptyState
        :title="filter === 'active' ? 'Sin objetivos activos' : 'Sin objetivos'"
        description="Crea uno arriba y divídelo en pasos; Lumi puede proponerte los primeros."
      />
    </BaseCard>
    <div v-else class="space-y-4">
      <LumiGoalCard v-for="goal in items" :key="goal.id" :goal="goal" :today="today" @updated="replace" @refresh="refresh" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { PERMISSIONS } from '#shared/auth/permissions'
import { lumiGoalCreateSchema, lumiGoalListSchema, type LumiGoal } from '#shared/schemas/lumi'
import { DEFAULT_LUMI_TIMEZONE } from '#shared/schemas/lumi-automation'
import { isoToZonedLocal } from '#shared/utils/datetime'
import LumiGoalCard from '~/features/lumi-admin/components/LumiGoalCard.vue'

definePageMeta({
  layout: 'admin',
  title: 'Objetivos',
  permissions: [PERMISSIONS.LUMI_USE],
  breadcrumbs: [{ label: 'Lumi' }, { label: 'Objetivos' }],
})

type Filter = 'active' | 'all'
const filters: Array<{ value: Filter; label: string }> = [
  { value: 'active', label: 'Activos' },
  { value: 'all', label: 'Todos' },
]

const { request } = useAdminApi()
const toast = useToast()

// Hoy en la zona de la tienda (para «Vencido» y el mínimo de la fecha).
const today = isoToZonedLocal(new Date().toISOString(), DEFAULT_LUMI_TIMEZONE).slice(0, 10)

const filter = ref<Filter>('active')
const { data, status, error, refresh } = useAsyncData(
  'admin-lumi-goals',
  async () => lumiGoalListSchema.parse(await request<unknown>('/api/admin/lumi/goals', { query: { status: filter.value } })),
  { watch: [filter] },
)
const items = computed<LumiGoal[]>(() => data.value?.items ?? [])
const loading = computed(() => status.value === 'pending')
const errorMessage = computed(() => (error.value ? toUiError(error.value).message : null))

/** Sustituye el objetivo actualizado sin recargar la lista (sale del filtro «Activos» si ya no lo está). */
function replace(goal: LumiGoal) {
  if (!data.value) return
  const before = data.value.items.find((g) => g.id === goal.id)
  const next = data.value.items.map((g) => (g.id === goal.id ? goal : g))
  data.value = { items: filter.value === 'active' && goal.status !== 'active' ? next.filter((g) => g.id !== goal.id) : next }
  if (goal.status === 'achieved' && before?.status === 'active') {
    toast.success('Objetivo logrado', filter.value === 'active' ? `«${goal.title}» pasa a «Todos».` : goal.title)
  }
}

const draftTitle = ref('')
const draftDate = ref('')
const draftDescription = ref('')
const draftError = ref<string | null>(null)
const creating = ref(false)

async function create() {
  const parsed = lumiGoalCreateSchema.safeParse({
    title: draftTitle.value,
    ...(draftDate.value ? { dueDate: draftDate.value } : {}),
    ...(draftDescription.value.trim() ? { description: draftDescription.value } : {}),
  })
  if (!parsed.success) {
    draftError.value = parsed.error.issues[0]?.message ?? 'Revisa el objetivo'
    return
  }
  draftError.value = null
  creating.value = true
  try {
    await request('/api/admin/lumi/goals', { method: 'POST', body: parsed.data })
    draftTitle.value = ''
    draftDate.value = ''
    draftDescription.value = ''
    toast.success('Objetivo creado', 'Añádele pasos o pide a Lumi que te proponga algunos.')
    if (filter.value !== 'active') filter.value = 'active'
    else await refresh()
  } catch (e) {
    toast.error('No se pudo crear', toUiError(e).message)
  } finally {
    creating.value = false
  }
}
</script>
