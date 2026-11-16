<template>
  <div class="space-y-5">
    <!-- 1. Cómo se añaden (vale para las frases pedidas y para las nuevas) -->
    <div v-if="canManage" class="space-y-3 rounded-xl border border-lumia-ink/[0.07] bg-lumia-cream/40 p-4">
      <p class="text-[13px] font-medium text-lumia-ink">Al añadir frases, esperar que Lumi…</p>
      <div class="grid gap-3 sm:grid-cols-3">
        <FormField :id="`${uid}-role`" label="Rol" :hint="PHRASE_ROLE_META[defaults.role].hint">
          <template #default="{ id, describedBy }">
            <BaseSelect :id="id" v-model="defaults.role" :options="roleOptions" :described-by="describedBy" :disabled="busy" />
          </template>
        </FormField>
        <FormField :id="`${uid}-status`" label="Resultado esperado">
          <template #default="{ id }">
            <BaseSelect :id="id" v-model="defaults.expectedStatus" :options="statusOptions" :disabled="busy" />
          </template>
        </FormField>
        <FormField :id="`${uid}-tool`" label="Herramienta esperada" :hint="defaultsToolEnabled ? undefined : 'Solo si usa una herramienta o pregunta un dato.'">
          <template #default="{ id, describedBy }">
            <BaseSelect :id="id" v-model="defaults.expectedTool" :options="toolOptions" :described-by="describedBy" :disabled="busy || !defaultsToolEnabled" />
          </template>
        </FormField>
      </div>
      <BaseCheckbox :id="`${uid}-critical`" v-model="defaults.critical">Marcarlas como críticas (la batería solo pasa si aciertan)</BaseCheckbox>
      <p v-if="toolMismatch" role="status" class="text-[12px] text-status-warning">
        Esta capacidad la resuelve «{{ TOOL_LABELS[capability.toolName!] ?? capability.toolName }}». ¿Seguro que esperas otra herramienta?
      </p>
    </div>

    <!-- 2. Frases que se pidieron y aún no están en las pruebas -->
    <div v-if="canManage && pending.length" class="space-y-2">
      <div class="flex flex-wrap items-center justify-between gap-2">
        <p class="text-[13px] font-medium text-lumia-ink">Frases que se pidieron ({{ pending.length }} sin añadir)</p>
        <button type="button" class="text-[12px] font-medium text-lumia-ink/60 underline decoration-lumia-ink/20 underline-offset-2 hover:text-lumia-ink" @click="togglePending">
          {{ allPendingChecked ? 'Quitar todas' : 'Marcar todas' }}
        </button>
      </div>
      <ul class="space-y-1">
        <li v-for="text in pending" :key="text">
          <label class="flex cursor-pointer items-start gap-2 rounded-lg px-2 py-1.5 text-[13px] text-lumia-ink/85 hover:bg-lumia-cream/60">
            <input v-model="checked" type="checkbox" :value="text" class="mt-0.5 h-4 w-4 accent-lumia-ink" :disabled="busy" />
            «{{ text }}»
          </label>
        </li>
      </ul>
      <BaseButton size="sm" :loading="busy && adding === 'bulk'" :disabled="busy || !checked.length" @click="addMany(checked, 'bulk')">
        <template #icon><IconPlus class="h-4 w-4" stroke-width="1.75" aria-hidden="true" /></template>
        Añadir {{ checked.length }} {{ checked.length === 1 ? 'frase' : 'frases' }}
      </BaseButton>
    </div>

    <!-- 3. Otra frase -->
    <form v-if="canManage" novalidate class="flex flex-col gap-2 sm:flex-row sm:items-end" @submit.prevent="addOwn">
      <FormField :id="`${uid}-text`" class="flex-1" label="Otra frase" :error="ownError ?? undefined" hint="Tal como la escribiría alguien del equipo.">
        <template #default="{ id, invalid, describedBy }">
          <BaseInput :id="id" v-model="ownText" maxlength="500" :invalid="invalid" :described-by="describedBy" :disabled="busy" />
        </template>
      </FormField>
      <BaseButton type="submit" size="sm" variant="secondary" class="sm:mb-6" :loading="busy && adding === 'own'" :disabled="busy">Añadir</BaseButton>
    </form>

    <!-- 4. Las frases de la batería -->
    <div>
      <p class="mb-2 text-[13px] font-medium text-lumia-ink">En la batería ({{ phrases.length }})</p>
      <div v-if="loading && !phrases.length" class="space-y-2">
        <BaseSkeleton v-for="n in 2" :key="n" class="h-12 w-full" />
      </div>
      <ErrorState v-else-if="loadError" :message="loadError" @retry="refresh" />
      <EmptyState v-else-if="!phrases.length" compact title="Sin frases todavía" description="Añade las que se pidieron con un clic, o escribe otras." />
      <ul v-else class="divide-y divide-lumia-ink/[0.06]">
        <li v-for="phrase in phrases" :key="phrase.id" class="space-y-2 py-3 first:pt-0">
          <div class="flex items-start justify-between gap-3">
            <p class="text-sm text-lumia-ink/85">«{{ phrase.text }}»</p>
            <BaseButton v-if="canManage" variant="ghost" size="sm" :disabled="busy || savingId === phrase.id" @click="onDelete(phrase)">
              <template #icon><IconTrash class="h-4 w-4" stroke-width="1.75" aria-hidden="true" /></template>
              <span class="sr-only">Eliminar la frase {{ phrase.text }}</span>
            </BaseButton>
          </div>
          <div v-if="canManage" class="grid gap-2 sm:grid-cols-[9rem_minmax(0,1fr)_minmax(0,1fr)_auto] sm:items-center">
            <BaseSelect :model-value="phrase.role" :options="roleOptions" :aria-label="`Rol de «${phrase.text}»`" :disabled="savingId === phrase.id" @update:model-value="(v) => patch(phrase, { role: v as PhraseRole })" />
            <BaseSelect :model-value="phrase.expectedStatus" :options="statusOptions" :aria-label="`Resultado esperado de «${phrase.text}»`" :disabled="savingId === phrase.id" @update:model-value="(v) => patch(phrase, { expectedStatus: v as ExpectedStatus })" />
            <BaseSelect
              :model-value="phrase.expectedTool ?? ''"
              :options="toolOptions"
              :aria-label="`Herramienta esperada de «${phrase.text}»`"
              :disabled="savingId === phrase.id || !STATUSES_WITH_TOOL.includes(phrase.expectedStatus)"
              @update:model-value="(v) => patch(phrase, { expectedTool: v || null })"
            />
            <label class="inline-flex items-center gap-1.5 text-[12px] text-lumia-ink/70">
              <input type="checkbox" class="h-4 w-4 accent-lumia-ink" :checked="phrase.critical" :disabled="savingId === phrase.id" @change="patch(phrase, { critical: !phrase.critical })" />
              Crítica
            </label>
          </div>
          <p v-else class="flex flex-wrap items-center gap-1.5 text-[12px] text-lumia-ink/55">
            <BaseBadge :tone="PHRASE_ROLE_META[phrase.role].tone">{{ PHRASE_ROLE_META[phrase.role].label }}</BaseBadge>
            <BaseBadge v-if="phrase.critical" tone="danger">Crítica</BaseBadge>
            <span>Espera: {{ OUTCOME_LABELS[phrase.expectedStatus] }}<template v-if="phrase.expectedTool"> · {{ TOOL_LABELS[phrase.expectedTool] ?? phrase.expectedTool }}</template></span>
          </p>
        </li>
      </ul>
    </div>
  </div>
</template>

<script setup lang="ts">
import { IconPlus, IconTrash } from '@tabler/icons-vue'
import type { Capability } from '#shared/schemas/lumi-capabilities'
import {
  EXPECTED_STATUSES,
  LUMI_TOOL_NAMES,
  OUTCOME_LABELS,
  PHRASE_ROLE_META,
  PHRASE_ROLES,
  phraseListResponseSchema,
  phraseResponseSchema,
  STATUSES_WITH_TOOL,
  TOOL_LABELS,
  type CapabilityPhrase,
  type ExpectedStatus,
  type PhraseRole,
} from '#shared/schemas/lumi-capability-tests'

/**
 * Frases de prueba de una capacidad. Las que se pidieron en el chat se añaden con un clic; los
 * valores por defecto apuntan a validar la herramienta de la capacidad; las frases ya añadidas se
 * cambian en línea, sin borrarlas.
 */
const props = defineProps<{ capability: Capability; requested: string[]; canManage: boolean }>()
const emit = defineEmits<{ changed: [phrases: CapabilityPhrase[]] }>()

const { request } = useAdminApi()
const toast = useToast()
const { confirm } = useConfirm()
const uid = useId()

const { data, status, error, refresh } = useAsyncData(
  () => `admin-lumi-capability-phrases-${props.capability.id}`,
  () => request<unknown>(`/api/admin/lumi/capabilities/${props.capability.id}/phrases`).then((raw) => phraseListResponseSchema.parse(raw)),
)
const phrases = computed<CapabilityPhrase[]>(() => data.value?.items ?? [])
const loading = computed(() => status.value === 'pending')
const loadError = computed(() => (error.value ? toUiError(error.value).message : null))
watch(phrases, (value) => emit('changed', value), { immediate: true })

const roleOptions = PHRASE_ROLES.map((r) => ({ value: r, label: PHRASE_ROLE_META[r].label }))
const statusOptions = EXPECTED_STATUSES.map((s) => ({ value: s, label: OUTCOME_LABELS[s] ?? s }))
const toolOptions = [{ value: '', label: 'Cualquiera' }, ...LUMI_TOOL_NAMES.map((t) => ({ value: t, label: TOOL_LABELS[t] ?? t }))]

/** Por defecto: validar que se usa la herramienta de la capacidad (si ya la tiene). */
const defaults = reactive<{ role: PhraseRole; expectedStatus: ExpectedStatus; expectedTool: string; critical: boolean }>({
  role: 'validation',
  expectedStatus: 'supported',
  expectedTool: props.capability.toolName ?? '',
  critical: false,
})
watch(
  () => props.capability.toolName,
  (tool) => {
    if (tool && !defaults.expectedTool) defaults.expectedTool = tool
  },
)
const defaultsToolEnabled = computed(() => STATUSES_WITH_TOOL.includes(defaults.expectedStatus))
watch(defaultsToolEnabled, (enabled) => {
  if (!enabled) defaults.expectedTool = ''
})
const toolMismatch = computed(
  () => Boolean(props.capability.toolName && defaults.expectedTool && defaults.expectedTool !== props.capability.toolName),
)

const normalize = (t: string) => t.replace(/\s+/g, ' ').trim().toLowerCase()
/** Frases pedidas que todavía no están en la batería. */
const pending = computed(() => {
  const existing = new Set(phrases.value.map((p) => normalize(p.text)))
  const seen = new Set<string>()
  return props.requested.filter((t) => {
    const key = normalize(t)
    if (!key || existing.has(key) || seen.has(key)) return false
    seen.add(key)
    return true
  })
})
const checked = ref<string[]>([])
/** Si el usuario ya marcó o desmarcó a mano, no se le vuelven a marcar todas. */
const touched = ref(false)
// Al aparecer frases pedidas nuevas, quedan marcadas: lo normal es querer todas.
watch(pending, (list) => {
  checked.value = list.filter((t) => checked.value.includes(t) || !touched.value)
}, { immediate: true })
const allPendingChecked = computed(() => pending.value.length > 0 && pending.value.every((t) => checked.value.includes(t)))
function togglePending() {
  touched.value = true
  checked.value = allPendingChecked.value ? [] : [...pending.value]
}

const busy = ref(false)
const adding = ref<'bulk' | 'own' | null>(null)
const ownText = ref('')
const ownError = ref<string | null>(null)

async function addMany(texts: string[], kind: 'bulk' | 'own'): Promise<number> {
  busy.value = true
  adding.value = kind
  let added = 0
  const failures: string[] = []
  try {
    const tool = defaultsToolEnabled.value && defaults.expectedTool ? defaults.expectedTool : null
    for (const text of texts) {
      try {
        await request(`/api/admin/lumi/capabilities/${props.capability.id}/phrases`, {
          method: 'POST',
          body: { text, role: defaults.role, expectedStatus: defaults.expectedStatus, expectedTool: tool, critical: defaults.critical },
        })
        added++
      } catch (e) {
        failures.push(`«${text}»: ${toUiError(e).message}`)
      }
    }
    if (added) toast.success(added === 1 ? 'Frase añadida' : `${added} frases añadidas`)
    if (failures.length) toast.error('Algunas no se añadieron', failures.join(' · '))
    await refresh()
    return added
  } finally {
    busy.value = false
    adding.value = null
  }
}

async function addOwn() {
  const text = ownText.value.trim()
  ownError.value = text.length < 2 ? 'Escribe la frase.' : null
  if (ownError.value) return
  if ((await addMany([text], 'own')) === 1) ownText.value = ''
}

const savingId = ref<string | null>(null)
async function patch(phrase: CapabilityPhrase, change: Partial<Pick<CapabilityPhrase, 'role' | 'expectedStatus' | 'expectedTool' | 'critical'>>) {
  savingId.value = phrase.id
  try {
    phraseResponseSchema.parse(
      await request<unknown>(`/api/admin/lumi/capabilities/${props.capability.id}/phrases/${phrase.id}`, { method: 'PATCH', body: change }),
    )
    await refresh()
  } catch (e) {
    toast.error('No se pudo cambiar la frase', toUiError(e).message)
  } finally {
    savingId.value = null
  }
}

async function onDelete(phrase: CapabilityPhrase) {
  const ok = await confirm({
    title: 'Eliminar frase',
    description: `«${phrase.text}» dejará de formar parte de las pruebas. Las ejecuciones anteriores se conservan.`,
    confirmLabel: 'Eliminar',
    tone: 'danger',
  })
  if (!ok) return
  savingId.value = phrase.id
  try {
    await request(`/api/admin/lumi/capabilities/${props.capability.id}/phrases/${phrase.id}`, { method: 'DELETE' })
    toast.success('Frase eliminada')
    await refresh()
  } catch (e) {
    toast.error('No se pudo eliminar', toUiError(e).message)
  } finally {
    savingId.value = null
  }
}
</script>
