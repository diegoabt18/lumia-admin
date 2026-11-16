<template>
  <form :id="formId" novalidate class="space-y-5" @submit="onSubmit">
    <div
      v-if="!readonly"
      class="flex flex-col gap-3 rounded-xl border border-lumia-ink/[0.08] bg-lumia-cream/50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
    >
      <p class="text-[13px] leading-relaxed text-lumia-ink/70" aria-live="polite">
        <template v-if="drafting">Lumi está redactando un borrador con las frases y el catálogo de herramientas…</template>
        <template v-else-if="appliedCount !== null">
          Borrador aplicado a {{ appliedCount }} {{ appliedCount === 1 ? 'campo' : 'campos' }}. Revísalo y pulsa «Guardar especificación».
        </template>
        <template v-else>Lumi puede proponer un borrador a partir de lo que pidieron. No se guarda hasta que lo confirmes.</template>
      </p>
      <div class="flex shrink-0 gap-2">
        <BaseButton v-if="undoSnapshot && !drafting" type="button" variant="ghost" size="sm" @click="undoDraft">Deshacer</BaseButton>
        <BaseButton type="button" variant="secondary" size="sm" :loading="drafting" :disabled="isSubmitting" @click="onDraft">
          <template #icon><IconSparkles class="h-4 w-4" stroke-width="1.75" aria-hidden="true" /></template>
          Completar con IA
        </BaseButton>
      </div>
    </div>

    <FormField
      v-for="field in CAPABILITY_SPEC_FIELDS"
      :id="`${formId}-${field.key}`"
      :key="field.key"
      :label="field.label"
      :error="errors[field.key]"
      :hint="field.hint"
    >
      <template #default="{ id, invalid, describedBy }">
        <BaseInput
          v-if="field.max <= 300"
          :id="id"
          v-model="draft[field.key]"
          :maxlength="field.max"
          :invalid="invalid"
          :described-by="describedBy"
          :disabled="readonly || isSubmitting || drafting"
        />
        <BaseTextarea
          v-else
          :id="id"
          v-model="draft[field.key]"
          :rows="field.key === 'notes' ? 4 : 2"
          :maxlength="field.max"
          :invalid="invalid"
          :described-by="describedBy"
          :disabled="readonly || isSubmitting || drafting"
        />
      </template>
    </FormField>

    <p v-if="formError" role="alert" class="rounded-xl border border-status-danger/20 bg-status-danger-soft/50 px-4 py-3 text-[13px] text-status-danger">
      {{ formError }}
    </p>

    <div v-if="!readonly" class="flex items-center justify-end gap-3">
      <span v-if="dirty" class="text-[12px] text-lumia-ink/50">Cambios sin guardar</span>
      <BaseButton type="submit" size="sm" :loading="isSubmitting" :disabled="!dirty || drafting">Guardar especificación</BaseButton>
    </div>
  </form>
</template>

<script setup lang="ts">
import { IconSparkles } from '@tabler/icons-vue'
import {
  CAPABILITY_SPEC_FIELDS,
  capabilityResponseSchema,
  capabilitySpecDraftResponseSchema,
  capabilitySpecSchema,
  type Capability,
  type CapabilitySpec,
  type CapabilitySpecKey,
} from '#shared/schemas/lumi-capabilities'

/**
 * Especificación para quien programe la herramienta. Se valida con el mismo esquema que el BFF y
 * se envía solo lo que cambió (el Server combina, no reemplaza).
 */
const props = defineProps<{ capability: Capability; readonly?: boolean }>()
const emit = defineEmits<{ saved: [capability: Capability] }>()

const { request } = useAdminApi()
const toast = useToast()
const formId = useId()
const formError = ref<string | null>(null)
const errors = ref<Partial<Record<CapabilitySpecKey, string>>>({})
const isSubmitting = ref(false)
const draft = reactive<CapabilitySpec>({ ...props.capability.spec })

watch(
  () => props.capability.spec,
  (spec) => Object.assign(draft, spec),
)

const changed = computed(() =>
  CAPABILITY_SPEC_FIELDS.map((f) => f.key).filter((key) => draft[key].trim() !== props.capability.spec[key]),
)
const dirty = computed(() => changed.value.length > 0)

/* ───────────── Borrador con IA ───────────── */

const { confirm } = useConfirm()
const drafting = ref(false)
const appliedCount = ref<number | null>(null)
/** Estado del formulario antes de aplicar el borrador, para «Deshacer». */
const undoSnapshot = ref<CapabilitySpec | null>(null)

async function onDraft() {
  if (props.readonly || drafting.value || isSubmitting.value) return
  drafting.value = true
  formError.value = null
  try {
    const { spec } = capabilitySpecDraftResponseSchema.parse(
      await request<unknown>(`/api/admin/lumi/capabilities/${props.capability.id}/spec-draft`, { method: 'POST', body: {} }),
    )
    const keys = CAPABILITY_SPEC_FIELDS.map((f) => f.key).filter((key) => spec[key])
    // Lo que el equipo ya escribió solo se reemplaza si se confirma.
    const conflicting = keys.filter((key) => draft[key].trim() && draft[key].trim() !== spec[key])
    let replace = true
    if (conflicting.length) {
      replace = await confirm({
        title: 'Reemplazar campos con texto',
        description: `${conflicting.length === 1 ? 'Un campo ya tiene' : `${conflicting.length} campos ya tienen`} texto. ¿Lo reemplazas por el borrador o completas solo los vacíos?`,
        confirmLabel: 'Reemplazar',
        cancelLabel: 'Solo los vacíos',
      })
    }
    const apply = keys.filter((key) => replace || !draft[key].trim())
    if (!apply.length) {
      toast.info('Nada que completar', 'El borrador no aporta nada a los campos vacíos.')
      return
    }
    undoSnapshot.value = { ...draft }
    for (const key of apply) draft[key] = spec[key]
    errors.value = {}
    appliedCount.value = apply.length
  } catch (error) {
    toast.error('No se pudo generar el borrador', toUiError(error).message)
  } finally {
    drafting.value = false
  }
}

function undoDraft() {
  if (!undoSnapshot.value) return
  Object.assign(draft, undoSnapshot.value)
  undoSnapshot.value = null
  appliedCount.value = null
}

async function onSubmit(event: Event) {
  event.preventDefault()
  if (props.readonly || !dirty.value || isSubmitting.value) return
  formError.value = null
  const parsed = capabilitySpecSchema.safeParse(draft)
  if (!parsed.success) {
    errors.value = zodFieldErrors(parsed.error) as Partial<Record<CapabilitySpecKey, string>>
    return
  }
  errors.value = {}
  const spec = Object.fromEntries(changed.value.map((key) => [key, parsed.data[key]]))
  isSubmitting.value = true
  try {
    const { capability } = capabilityResponseSchema.parse(
      await request<unknown>(`/api/admin/lumi/capabilities/${props.capability.id}`, { method: 'PATCH', body: { spec } }),
    )
    undoSnapshot.value = null
    appliedCount.value = null
    toast.success('Especificación guardada')
    emit('saved', capability)
  } catch (error) {
    const ui = toUiError(error)
    errors.value = bffFieldErrors(ui.fieldErrors) as Partial<Record<CapabilitySpecKey, string>>
    formError.value = ui.message
  } finally {
    isSubmitting.value = false
  }
}
</script>
