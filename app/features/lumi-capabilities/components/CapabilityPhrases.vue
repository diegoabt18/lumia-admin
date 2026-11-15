<template>
  <div class="space-y-5">
    <div v-if="loading && !phrases.length" class="space-y-2">
      <BaseSkeleton v-for="n in 2" :key="n" class="h-12 w-full" />
    </div>
    <ErrorState v-else-if="loadError" :message="loadError" @retry="refresh" />
    <EmptyState
      v-else-if="!phrases.length"
      compact
      title="Sin frases de prueba"
      description="Añade frases con el resultado que esperas. Las de validación deciden si la capacidad pasa la batería."
    />
    <ul v-else class="divide-y divide-lumia-ink/[0.06]">
      <li v-for="phrase in phrases" :key="phrase.id" class="flex items-start justify-between gap-3 py-3 first:pt-0">
        <div class="min-w-0">
          <p class="text-sm text-lumia-ink/85">«{{ phrase.text }}»</p>
          <p class="mt-1 flex flex-wrap items-center gap-1.5 text-[12px] text-lumia-ink/55">
            <BaseBadge :tone="PHRASE_ROLE_META[phrase.role].tone">{{ PHRASE_ROLE_META[phrase.role].label }}</BaseBadge>
            <BaseBadge v-if="phrase.critical" tone="danger">Crítica</BaseBadge>
            <span>Espera: {{ OUTCOME_LABELS[phrase.expectedStatus] }}<template v-if="phrase.expectedTool"> · {{ TOOL_LABELS[phrase.expectedTool] ?? phrase.expectedTool }}</template></span>
          </p>
        </div>
        <BaseButton v-if="canManage" variant="ghost" size="sm" :loading="deletingId === phrase.id" :disabled="Boolean(deletingId)" @click="onDelete(phrase)">
          <template #icon><IconTrash class="h-4 w-4" stroke-width="1.75" aria-hidden="true" /></template>
          <span class="sr-only">Eliminar la frase {{ phrase.text }}</span>
        </BaseButton>
      </li>
    </ul>

    <form v-if="canManage" novalidate class="space-y-4 rounded-xl border border-lumia-ink/[0.07] bg-lumia-cream/40 p-4" @submit.prevent="onAdd">
      <p class="text-[13px] font-medium text-lumia-ink">Añadir frase</p>
      <FormField :id="`${formId}-text`" label="Frase" :error="errors.text" hint="Tal como la escribiría alguien del equipo." required>
        <template #default="{ id, invalid, describedBy }">
          <BaseInput :id="id" v-model="draft.text" maxlength="500" :invalid="invalid" :described-by="describedBy" :disabled="saving" />
        </template>
      </FormField>
      <div class="grid gap-4 sm:grid-cols-3">
        <FormField :id="`${formId}-role`" label="Rol" :hint="PHRASE_ROLE_META[draft.role].hint" required>
          <template #default="{ id, describedBy }">
            <BaseSelect :id="id" v-model="draft.role" :options="roleOptions" :described-by="describedBy" :disabled="saving" />
          </template>
        </FormField>
        <FormField :id="`${formId}-status`" label="Resultado esperado" required>
          <template #default="{ id }">
            <BaseSelect :id="id" v-model="draft.expectedStatus" :options="statusOptions" :disabled="saving" />
          </template>
        </FormField>
        <FormField :id="`${formId}-tool`" label="Herramienta esperada" :hint="toolEnabled ? 'Opcional.' : 'Solo si usa una herramienta o pregunta un dato.'">
          <template #default="{ id, describedBy }">
            <BaseSelect :id="id" v-model="draft.expectedTool" :options="toolOptions" :described-by="describedBy" :disabled="saving || !toolEnabled" />
          </template>
        </FormField>
      </div>
      <BaseCheckbox :id="`${formId}-critical`" v-model="draft.critical">Crítica: la batería solo pasa si esta frase acierta</BaseCheckbox>
      <p v-if="formError" role="alert" class="rounded-xl border border-status-danger/20 bg-status-danger-soft/50 px-4 py-3 text-[13px] text-status-danger">{{ formError }}</p>
      <div class="flex justify-end">
        <BaseButton type="submit" size="sm" :loading="saving">Añadir frase</BaseButton>
      </div>
    </form>
  </div>
</template>

<script setup lang="ts">
import { IconTrash } from '@tabler/icons-vue'
import {
  addPhraseInputSchema,
  EXPECTED_STATUSES,
  LUMI_TOOL_NAMES,
  OUTCOME_LABELS,
  PHRASE_ROLE_META,
  PHRASE_ROLES,
  phraseListResponseSchema,
  STATUSES_WITH_TOOL,
  TOOL_LABELS,
  type CapabilityPhrase,
  type ExpectedStatus,
  type PhraseRole,
} from '#shared/schemas/lumi-capability-tests'

const props = defineProps<{ capabilityId: string; canManage: boolean }>()
const emit = defineEmits<{ changed: [phrases: CapabilityPhrase[]] }>()

const { request } = useAdminApi()
const toast = useToast()
const { confirm } = useConfirm()
const formId = useId()

const { data, status, error, refresh } = useAsyncData(
  () => `admin-lumi-capability-phrases-${props.capabilityId}`,
  () => request<unknown>(`/api/admin/lumi/capabilities/${props.capabilityId}/phrases`).then((raw) => phraseListResponseSchema.parse(raw)),
)
const phrases = computed<CapabilityPhrase[]>(() => data.value?.items ?? [])
const loading = computed(() => status.value === 'pending')
const loadError = computed(() => (error.value ? toUiError(error.value).message : null))
watch(phrases, (value) => emit('changed', value), { immediate: true })

const roleOptions = PHRASE_ROLES.map((r) => ({ value: r, label: PHRASE_ROLE_META[r].label }))
const statusOptions = EXPECTED_STATUSES.map((s) => ({ value: s, label: OUTCOME_LABELS[s] ?? s }))
const toolOptions = [{ value: '', label: 'Cualquiera' }, ...LUMI_TOOL_NAMES.map((t) => ({ value: t, label: TOOL_LABELS[t] ?? t }))]

const draft = reactive<{ text: string; role: PhraseRole; expectedStatus: ExpectedStatus; expectedTool: string; critical: boolean }>({
  text: '',
  role: 'validation',
  expectedStatus: 'supported',
  expectedTool: '',
  critical: false,
})
const toolEnabled = computed(() => STATUSES_WITH_TOOL.includes(draft.expectedStatus))
watch(toolEnabled, (enabled) => {
  if (!enabled) draft.expectedTool = ''
})

const errors = ref<Record<string, string>>({})
const formError = ref<string | null>(null)
const saving = ref(false)

async function onAdd() {
  if (saving.value) return
  formError.value = null
  const parsed = addPhraseInputSchema.safeParse({
    text: draft.text,
    role: draft.role,
    expectedStatus: draft.expectedStatus,
    expectedTool: toolEnabled.value && draft.expectedTool ? draft.expectedTool : null,
    critical: draft.critical,
  })
  if (!parsed.success) {
    errors.value = zodFieldErrors(parsed.error)
    return
  }
  errors.value = {}
  saving.value = true
  try {
    await request(`/api/admin/lumi/capabilities/${props.capabilityId}/phrases`, { method: 'POST', body: parsed.data })
    toast.success('Frase añadida')
    draft.text = ''
    draft.critical = false
    await refresh()
  } catch (e) {
    const ui = toUiError(e)
    errors.value = bffFieldErrors(ui.fieldErrors)
    formError.value = ui.message
  } finally {
    saving.value = false
  }
}

const deletingId = ref<string | null>(null)
async function onDelete(phrase: CapabilityPhrase) {
  const ok = await confirm({
    title: 'Eliminar frase',
    description: `«${phrase.text}» dejará de formar parte de las pruebas. Las ejecuciones anteriores se conservan.`,
    confirmLabel: 'Eliminar',
    tone: 'danger',
  })
  if (!ok) return
  deletingId.value = phrase.id
  try {
    await request(`/api/admin/lumi/capabilities/${props.capabilityId}/phrases/${phrase.id}`, { method: 'DELETE' })
    toast.success('Frase eliminada')
    await refresh()
  } catch (e) {
    toast.error('No se pudo eliminar', toUiError(e).message)
  } finally {
    deletingId.value = null
  }
}
</script>
